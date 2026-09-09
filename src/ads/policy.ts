export type AdPlacement="home_banner"|"post_match_interstitial"|"rewarded_pack_trial"|"lobby_house";
export type AdPhase="home"|"lobby"|"answering"|"voting"|"reveal"|"finished";

export interface AdContext {
  placement:AdPlacement;
  phase:AdPhase;
  isVip:boolean;
  underAge:boolean;
  personalizedConsent:boolean;
  explicitRewardOptIn?:boolean;
  lastInterstitialAt?:number;
  now:number;
  enabledPlacements?:ReadonlySet<AdPlacement>;
}

export interface AdDecision { allowed:boolean; personalized:boolean; reason:string }

const activeRoundPhases=new Set<AdPhase>(["answering","voting","reveal"]);

export function decideAd(context:AdContext):AdDecision {
  if (context.enabledPlacements && !context.enabledPlacements.has(context.placement)) return deny("remote_disabled");
  if (context.isVip && context.placement!=="lobby_house") return deny("vip");
  if (activeRoundPhases.has(context.phase)) return deny("active_round");
  if (context.placement==="home_banner" && context.phase!=="home") return deny("wrong_phase");
  if (context.placement==="lobby_house" && context.phase!=="lobby") return deny("wrong_phase");
  if (context.placement==="post_match_interstitial") {
    if (context.phase!=="finished") return deny("match_not_finished");
    if (context.lastInterstitialAt!==undefined && context.now-context.lastInterstitialAt<12*60_000) return deny("frequency_cap");
  }
  if (context.placement==="rewarded_pack_trial" && !context.explicitRewardOptIn) return deny("opt_in_required");
  return {allowed:true,personalized:!context.underAge&&context.personalizedConsent,reason:"allowed"};
}

function deny(reason:string):AdDecision { return {allowed:false,personalized:false,reason}; }

export interface VerifiedReward {provider:string;transactionId:string;userId:string;packId:string;verifiedAt:number}

export class RewardLedger {
  private readonly transactions=new Set<string>();
  private readonly trials=new Map<string,{packId:string;expiresAt:number}>();

  grant(reward:VerifiedReward,trialMs=24*60*60_000):{duplicate:boolean;expiresAt:number} {
    const key=`${reward.provider}:${reward.transactionId}`;
    const existing=this.trials.get(key);
    if (existing) return {duplicate:true,expiresAt:existing.expiresAt};
    if (this.transactions.has(key)) throw new Error("Reward transaction is inconsistent");
    this.transactions.add(key);
    const expiresAt=reward.verifiedAt+trialMs;
    this.trials.set(key,{packId:reward.packId,expiresAt});
    return {duplicate:false,expiresAt};
  }
}
