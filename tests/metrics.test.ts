import test from "node:test";
import assert from "node:assert/strict";
import { MetricsRegistry } from "../src/observability/metrics.js";

test("metrics aggregate stable labels and escape values",()=>{
  const metrics=new MetricsRegistry();
  metrics.add("commands_total",1,{result:"ok",event:'vote"now'});
  metrics.add("commands_total",2,{event:'vote"now',result:"ok"});
  assert.match(metrics.render(),/commands_total\{event="vote\\"now",result="ok"\} 3/u);
});

test("metrics reject invalid names and non-finite values",()=>{
  const metrics=new MetricsRegistry();
  assert.throws(()=>metrics.add("bad metric"));
  assert.throws(()=>metrics.set("gauge",Number.NaN));
});
