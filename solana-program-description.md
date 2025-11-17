# Solana Twitter Program Documentation

## Overview

This is a Solana program built with Anchor that allows users to create and store tweets on the blockchain. Each tweet is stored as a separate account on-chain, containing the author's public key, timestamp, topic, and content.

**Program ID**: `2dMFz4k7X9yy3VLVJgUYds1aYxAd4YaW3nsCDyhhgDVe`

## Program Structure

### Main Function: `send_tweet`

The program exposes one main function that allows users to create and store tweets:

```rust
pub fn send_tweet(ctx: Context<SendTweet>, topic: String, content: String) -> Result<()>
```

**Parameters:**

- `ctx`: Context containing the accounts needed for the transaction
- `topic`: The topic/category of the tweet (max 200 characters)
- `content`: The tweet content (max 1120 characters)

**Functionality:**

1. Validates that topic and content don't exceed maximum lengths
2. Gets the current blockchain timestamp using `Clock::get()`
3. Sets the tweet's author to the signer's public key
4. Stores the timestamp, topic, and content in the tweet account

### Account Context: `SendTweet`

The `SendTweet` struct defines the accounts required for the `send_tweet` instruction:

```rust
#[derive(Accounts)]
pub struct SendTweet<'info> {
    #[account(init, payer = author, space = Tweet::LEN)]
    pub tweet: Account<'info, Tweet>,
    #[account(mut)]
    pub author: Signer<'info>,
    pub system_program: Program<'info, System>,
}
```

**Account Details:**

- **`tweet`**: The tweet account to be created
  - `init`: Creates a new account
  - `payer = author`: The author pays for account creation (rent)
  - `space = Tweet::LEN`: Allocates the correct amount of space for the account
- **`author`**: The wallet signing and paying for the transaction
  - `mut`: Must be mutable (balance will change when paying rent)
  - `Signer`: Must sign the transaction
- **`system_program`**: Required for account creation

### Data Structure: `Tweet`

The `Tweet` struct represents the data stored in each tweet account:

```rust
#[account]
pub struct Tweet {
    pub author: Pubkey,      // 32 bytes - The public key of the tweet author
    pub timestamp: i64,      // 8 bytes - Unix timestamp when tweet was created
    pub topic: String,        // Variable - The topic/category (max 200 chars)
    pub content: String,      // Variable - The tweet content (max 1120 chars)
}
```

## Error Handling

The program defines custom error codes using Anchor's `#[error_code]` attribute:

```rust
#[error_code]
pub enum ErrorCode {
    #[msg("Topic is too long")]
    TopicTooLong,
    #[msg("Content is too long")]
    ContentTooLong,
}
```

These errors are returned when:

- Topic exceeds 200 characters (50 \* 4 bytes for UTF-8)
- Content exceeds 1120 characters (280 \* 4 bytes for UTF-8)

## Account Size Calculation

The program calculates the exact size needed for each tweet account:

**Constants:**

- `DISCRIMINATOR_LENGTH`: 8 bytes (Anchor's account discriminator)
- `PUBKEY_LENGTH`: 32 bytes (Solana public key)
- `TIMESTAMP_LENGTH`: 8 bytes (i64)
- `STRING_LENGTH_PREFIX`: 4 bytes (Anchor's String length prefix)
- `MAX_TOPIC_LENGTH`: 200 bytes (50 \* 4 for UTF-8)
- `MAX_CONTENT_LENGTH`: 1120 bytes (280 \* 4 for UTF-8)

**Total Account Size (`Tweet::LEN`):**

```
8 (discriminator)
+ 32 (author Pubkey)
+ 8 (timestamp)
+ 4 + 200 (topic string prefix + max topic)
+ 4 + 1120 (content string prefix + max content)
= 1376 bytes
```

## How It Works

1. **User calls `send_tweet`** with topic and content strings
2. **Anchor validates** the accounts in `SendTweet` context:
   - Checks the author is a signer
   - Creates a new tweet account (if it doesn't exist)
   - Ensures the author has enough SOL to pay for rent
3. **Program validates** input:
   - Checks topic length ≤ 200 characters
   - Checks content length ≤ 1120 characters
4. **Program sets tweet data**:
   - Author: Signer's public key
   - Timestamp: Current blockchain time
   - Topic: Provided topic string
   - Content: Provided content string
5. **Account is stored** on-chain with rent paid by the author

## Important Notes

⚠️ **Cost Consideration**: Each tweet creates a new account, requiring rent payment (approximately 0.001-0.002 SOL per tweet). For high-volume applications, consider using a PDA-based approach to store multiple tweets in a single account.

## Usage Example

```typescript
// Client-side (TypeScript/JavaScript)
await program.methods
  .sendTweet("solana", "Hello from Solana!")
  .accounts({
    tweet: tweetKeypair.publicKey,
    author: wallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .signers([tweetKeypair])
  .rpc();
```
