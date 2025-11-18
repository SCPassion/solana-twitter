import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaTwitter } from "../target/types/solana_twitter";
import * as assert from "assert";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

// use anchor test: to start the test by a new empty ledger
// Aka, it starts a fresh local solana validator for each test run
// empty ledger = no previous transactions or accounts.

describe("solana-twitter", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  // Use the registed provider to create a new program object
  const program = anchor.workspace.solanaTwitter as Program<SolanaTwitter>;

  // Why didn't we need to do airdrop some money to our wallet on the first 2 tests?
  // because every time a new local ledger is created, it automatically airdrops 500 million SOL to your local wallet which,
  // by default, is located at ~/.config/solana/id.json.

  // Running anchor test starts a new local ledger for us and therefore airdrops some money to our wallet automatically every single time.
  // That's why we never need to airdrop money into our local wallet before each test.

  it("can send a new tweet", async () => {
    // Generate a new keypair for the tweet
    const tweet = anchor.web3.Keypair.generate();

    // Add your test here.
    await program.methods
      .sendTweet("veganism", "Hummus, am I right?") // This is the instruction to send the tweet
      .accounts({
        // These are the accounts information that are needed for the transaction
        tweet: tweet.publicKey,
        author: program.provider.publicKey, // author is the default signer in the context struct, see Anchor.toml provider wallet
        // system program is included by default
      })
      .signers([tweet]) // tweet is init, so it needs to be signed. Signer Author is default to be a signer
      .rpc(); // .rpc() automatically signs the transaction and sends it to the cluster

    const tweetAccount = await program.account.tweet.fetch(tweet.publicKey);

    assert.equal(
      tweetAccount.author.toBase58(),
      program.provider.publicKey.toBase58()
    );
    assert.equal(tweetAccount.topic, "veganism");
    assert.equal(tweetAccount.content, "Hummus, am I right?");
    assert.ok(tweetAccount.timestamp); // ensure timestamp is not empty
  });

  it("can send a new tweet without a topic", async () => {
    // Generate a new keypair for the tweet
    const tweet = anchor.web3.Keypair.generate();

    // Add your test here.
    await program.methods
      .sendTweet("", "gm") // This is the instruction to send the tweet
      .accounts({
        // These are the accounts information that are needed for the transaction
        tweet: tweet.publicKey,
        author: program.provider.publicKey,
        // system program is included by default
      })
      .signers([tweet]) // tweet is init, so it needs to be signed. Signer Author is default to be a signer
      .rpc(); // .rpc() automatically signs the transaction and sends it to the cluster

    const tweetAccount = await program.account.tweet.fetch(tweet.publicKey);

    assert.equal(
      tweetAccount.author.toBase58(),
      program.provider.publicKey.toBase58()
    );
    assert.equal(tweetAccount.topic, "");
    assert.equal(tweetAccount.content, "gm");
    assert.ok(tweetAccount.timestamp); // ensure timestamp is not empty
  });

  it("can send a new tweet from a different author", async () => {
    // Generate a new keypair for the other author
    const otherAuthor = anchor.web3.Keypair.generate();
    // Generate a new keypair for the tweet
    const tweet = anchor.web3.Keypair.generate();

    // In anchor, program.provider author is the default signer, anchor will airdrop SOL before the transaction to the default signer
    // However, if we want to test a different author, we need to airdrop SOL to the other author
    // This is because the other author is not a signer in the context struct, so anchor will not airdrop SOL to it
    // Anchor will airdrop to the signer accounts

    // This is only requesting the airdrop, we need to wait long enough for the airdrop to be completed
    const airdropSignature = await program.provider.connection.requestAirdrop(
      otherAuthor.publicKey,
      LAMPORTS_PER_SOL * 1
    );

    // This is confirming the airdrop, we need to wait long enough for the airdrop to be completed
    await program.provider.connection.confirmTransaction(
      airdropSignature,
      "confirmed"
    );

    await program.methods
      .sendTweet("Hello topic", "From another author")
      .accounts({
        tweet: tweet.publicKey,
        author: otherAuthor.publicKey,
      })
      .signers([otherAuthor, tweet]) // otherAuthor must added to here, because it is not a signer in the context struct
      .rpc();

    const tweetAccount = await program.account.tweet.fetch(tweet.publicKey);

    assert.equal(
      tweetAccount.author.toBase58(),
      otherAuthor.publicKey.toBase58()
    );
    assert.equal(tweetAccount.topic, "Hello topic");
    assert.equal(tweetAccount.content, "From another author");
    assert.ok(tweetAccount.timestamp); // ensure timestamp is not empty
  });

  it("cannot provide a topic more than 50 characters", async () => {
    // Generate a new keypair for the tweet
    const tweet = anchor.web3.Keypair.generate();
    const topic = "a".repeat(51);

    // Add your test here.
    try {
      await program.methods
        .sendTweet(topic, "content") // This is the instruction to send the tweet
        .accounts({
          // These are the accounts information that are needed for the transaction
          tweet: tweet.publicKey,
          author: program.provider.publicKey,
          // system program is included by default
        })
        .signers([tweet]) // tweet is init, so it needs to be signed. Signer Author is default to be a signer
        .rpc(); // .rpc() automatically signs the transaction and sends it to the cluster

      const tweetAccount = await program.account.tweet.fetch(tweet.publicKey);

      assert.fail("The topic should be <= 50");
    } catch (error) {
      if (error instanceof anchor.AnchorError) {
        assert.equal(error.error.errorMessage, "Topic is too long");
      }
    }
  });

  it("cannot provide a content more than 280 characters", async () => {
    // Generate a new keypair for the tweet
    const tweet = anchor.web3.Keypair.generate();
    const content = "a".repeat(281);

    // Add your test here.
    try {
      await program.methods
        .sendTweet("topic", content) // This is the instruction to send the tweet
        .accounts({
          // These are the accounts information that are needed for the transaction
          tweet: tweet.publicKey,
          author: program.provider.publicKey,
          // system program is included by default
        })
        .signers([tweet]) // tweet is init, so it needs to be signed. Signer Author is default to be a signer
        .rpc(); // .rpc() automatically signs the transaction and sends it to the cluster

      const tweetAccount = await program.account.tweet.fetch(tweet.publicKey);

      assert.fail("The topic should be <= 280");
    } catch (error) {
      if (error instanceof anchor.AnchorError) {
        assert.equal(error.error.errorMessage, "Content is too long");
      }
    }
  });

  it("fetch all tweets", async () => {
    // Fetch all tweets from the program, it returns an array of tweet accounts owned by your program "solana-twitter" regardless of the author
    const tweets = await program.account.tweet.all();
    // we sent 3 tweets in the previous tests, so we expect 3 tweets in the array

    // Log each tweet to see which ones exist
    tweets.forEach((tweet, index) => {
      console.log(`Tweet ${index + 1}:`, {
        publicKey: tweet.publicKey.toBase58(),
        author: tweet.account.author.toBase58(),
        topic: tweet.account.topic,
        content: tweet.account.content.substring(0, 30) + "...",
      });
    });
    assert.equal(tweets.length, 3);
  });

  it("can filter tweets by author", async () => {
    const authorPublicKey = program.provider.publicKey;
    const tweets = await program.account.tweet.all([
      {
        memcmp: {
          offset: 8, // bypass the discriminator, author starts at the 8th byts
          bytes: authorPublicKey.toBase58(),
        },
      },
    ]);

    assert.equal(tweets.length, 2);
    assert.ok(
      tweets.every(
        // all the tweets should be owned by the same author, if 1 is not, return false, hence assert.ok will fail
        (tweet) =>
          tweet.account.author.toBase58() === authorPublicKey.toBase58()
      )
    );
  });
});
