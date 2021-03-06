/**
 * Test Script that creates a client to
 * interact with Program (host) i.e. lib.rs
 * */ 

 import * as anchor from '@project-serum/anchor';
 import { Program } from '@project-serum/anchor';
 import { SolanaTwitter } from '../target/types/solana_twitter';
 import * as assert from "assert";
 import * as bs58 from "bs58";
 
 describe('solana-twitter', () => {
 
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.SolanaTwitter as Program<SolanaTwitter>;

  // async() call asynchronous (not occuring in the same time)
  // functions inside it
  it('can send a new tweet', async () => {

    const tweet = anchor.web3.Keypair.generate();
      /**
      * Before sending the transaction to the blockchain.
      * 
      * rpc object exposes an API matching our program's instructions
      * 
      * This allows us to call the send_tweet function from lib.rs
      * 
      * Note that, in JavaScript, Anchor automatically transforms 
      * snake case variables into camel case variables
      * 
      * send_tweet -> sendTweet
      * system_program -> systemProgram
      */

      await program.rpc.sendTweet('veganism', 'Hummus, am I right?', {
          accounts: {
              // Accounts here...
              tweet: tweet.publicKey,
              author: program.provider.wallet.publicKey,
              systemProgram: anchor.web3.SystemProgram.programId,
          },

          // Since Anchor automatically adds the wallet 
          // as a signer to each transaction, 
          // we don't need to change the signers array
          signers: [tweet],
      });

      // After sending the transaction to the blockchain.
      const tweetAccount = await program.account.tweet.fetch(tweet.publicKey);
          
      // Ensure it has the right data.
      assert.equal(tweetAccount.author.toBase58(), program.provider.wallet.publicKey.toBase58());
      assert.equal(tweetAccount.topic, 'veganism');
      assert.equal(tweetAccount.content, 'Hummus, am I right?');
      assert.ok(tweetAccount.timestamp);
      
      
      console.log(tweetAccount);
      console.log(tweetAccount.author.toBase58());
      console.log("\nhello!");
    
  });

  it('can fetch all tweets', async () => {
    const tweetAccounts = await program.account.tweet.all();
    // console.log(tweetAccounts);
    assert.equal(tweetAccounts.length, 3);
  });

  it('can filter tweets by author', async () => {
    const authorPublicKey = program.provider.wallet.publicKey
    const tweetAccounts = await program.account.tweet.all([
        {
            memcmp: {
                offset: 8, // Discriminator.
                bytes: authorPublicKey.toBase58(),
            }
        }
    ]);

    assert.equal(tweetAccounts.length, 2);
    assert.ok(tweetAccounts.every(tweetAccount => {
        return tweetAccount.account.author.toBase58() === authorPublicKey.toBase58()
    }))
  }); 

  it('can filter tweets by topics', async () => {
    const tweetAccounts = await program.account.tweet.all([
        {
            memcmp: {
                offset: 8 + // Discriminator.
                    32 + // Author public key.
                    8 + // Timestamp.
                    4, // Topic string prefix.
                bytes: bs58.encode(Buffer.from('veganism')),
            }
        }
    ]);

    assert.equal(tweetAccounts.length, 2);
    assert.ok(tweetAccounts.every(tweetAccount => {
        return tweetAccount.account.topic === 'veganism'
    }))
  });

});
