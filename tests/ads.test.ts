import test from "node:test";
import assert from "node:assert/strict";
import { decideAd, RewardLedger } from "../src/ads/policy.js";

const base={phase:"finished" as const,isVip:false,underAge:false,personalizedConsent:true,now:1_000_000};

test("third-party ads never appear during an active round or for VIP",()=>{
  assert.equal(decideAd({...base,phase:"answering",placement:"home_banner"}).reason,"active_round");
  assert.equal(decideAd({...base,isVip:true,placement:"post_match_interstitial"}).reason,"vip");
});

test("post-match interstitial respects phase and twelve-minute cap",()=>{
  assert.equal(decideAd({...base,placement:"post_match_interstitial"}).allowed,true);
  assert.equal(decideAd({...base,placement:"post_match_interstitial",lastInterstitialAt:base.now-1000}).reason,"frequency_cap");
  assert.equal(decideAd({...base,phase:"lobby",placement:"post_match_interstitial"}).reason,"match_not_finished");
});

test("under-age users only receive non-personalized eligible ads",()=>{
  const result=decideAd({...base,underAge:true,placement:"post_match_interstitial"});
  assert.equal(result.allowed,true);
  assert.equal(result.personalized,false);
});

test("reward must be explicit and a verified transaction grants once",()=>{
  assert.equal(decideAd({...base,placement:"rewarded_pack_trial"}).reason,"opt_in_required");
  const ledger=new RewardLedger();
  const reward={provider:"admob",transactionId:"tx",userId:"u",packId:"egypt",verifiedAt:1000};
  assert.equal(ledger.grant(reward).duplicate,false);
  assert.equal(ledger.grant(reward).duplicate,true);
});
