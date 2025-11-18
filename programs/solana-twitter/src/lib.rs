use anchor_lang::prelude::*;

declare_id!("2dMFz4k7X9yy3VLVJgUYds1aYxAd4YaW3nsCDyhhgDVe");

// Anchor makes dealing with errors a breeze by allowing us to define an ErrorCode enum using the #[error_code] Rust attribute
#[error_code]
pub enum ErrorCode {
    #[msg("Topic is too long")]
    TopicTooLong,
    #[msg("Content is too long")]
    ContentTooLong,
}

// Anchor program struct
#[program]
pub mod solana_twitter {
    use super::*;

    pub fn send_tweet(ctx: Context<SendTweet>, topic: String, content: String) -> Result<()> {
        let tweet = &mut ctx.accounts.tweet;
        let author = &mut ctx.accounts.author;
        let clock = Clock::get().unwrap();

        if topic.chars().count() > MAX_TOPIC_LENGTH_CHARS {
            return Err(ErrorCode::TopicTooLong.into());
        }
        if content.chars().count() > MAX_CONTENT_LENGTH_CHARS {
            return Err(ErrorCode::ContentTooLong.into());
        }

        tweet.author = author.key();
        tweet.timestamp = clock.unix_timestamp;
        tweet.topic = topic;
        tweet.content = content;

        Ok(())
    }
}

// Anchor defines the context struct for the send_tweet function
#[derive(Accounts)]
pub struct SendTweet<'info> {
    #[account(init, payer = author, space = Tweet::LEN)]
    // deriving init, meaning that tweet is a signer
    pub tweet: Account<'info, Tweet>, // This is the tweet account that will be created and stored in the blockchain.
    #[account(mut)] // This is the payer account, so must be mutable.
    pub author: Signer<'info>, // This is the wallet sending and signing the transaction.
    pub system_program: Program<'info, System>,
}

// define tweet account used in the context struct
#[account]
pub struct Tweet {
    pub author: Pubkey,
    pub timestamp: i64,
    pub topic: String,
    pub content: String,
}

const DISCRIMINATOR_LENGTH: usize = 8;
const PUBKEY_LENGTH: usize = 32;
const TIMESTAMP_LENGTH: usize = 8;
const STRING_LENGTH_PREFIX: usize = 4; //
const MAX_TOPIC_LENGTH_BYTES: usize = 50 * 4;
const MAX_TOPIC_LENGTH_CHARS: usize = 50;
const MAX_CONTENT_LENGTH_BYTES: usize = 280 * 4;
const MAX_CONTENT_LENGTH_CHARS: usize = 280;
// implement Tweet length, later can be accessed as Tweet::LEN
impl Tweet {
    const LEN: usize = DISCRIMINATOR_LENGTH
        + PUBKEY_LENGTH
        + TIMESTAMP_LENGTH
        + STRING_LENGTH_PREFIX + MAX_TOPIC_LENGTH_BYTES // prefix for topic length + topic length
        + STRING_LENGTH_PREFIX + MAX_CONTENT_LENGTH_BYTES; // prefix for content length + content length
}
