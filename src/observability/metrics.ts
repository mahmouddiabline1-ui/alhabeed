const metricName=/^[a-zA-Z_:][a-zA-Z0-9_:]*$/u;
const escapeLabel=(value:string)=>value.replace(/\\/gu,"\\\\").replace(/"/gu,'\\"').replace(/\n/gu,"\\n");

export class MetricsRegistry {
  private readonly values=new Map<string,{name:string;labels:Record<string,string>;value:number}>();

  add(name:string,amount=1,labels:Record<string,string>={}):void {
    if(!metricName.test(name)||!Number.isFinite(amount))throw new Error("Invalid metric");
    const normalized=Object.fromEntries(Object.entries(labels).sort(([a],[b])=>a.localeCompare(b)));
    const key=`${name}:${JSON.stringify(normalized)}`;
    const current=this.values.get(key);
    if(current)current.value+=amount;else this.values.set(key,{name,labels:normalized,value:amount});
  }
  set(name:string,value:number,labels:Record<string,string>={}):void {
    if(!metricName.test(name)||!Number.isFinite(value))throw new Error("Invalid metric");
    const normalized=Object.fromEntries(Object.entries(labels).sort(([a],[b])=>a.localeCompare(b)));
    this.values.set(`${name}:${JSON.stringify(normalized)}`,{name,labels:normalized,value});
  }
  render():string {
    return [...this.values.values()].sort((a,b)=>a.name.localeCompare(b.name)).map(item=>{
      const labels=Object.entries(item.labels).map(([key,value])=>`${key}="${escapeLabel(value)}"`).join(",");
      return `${item.name}${labels?`{${labels}}`:""} ${item.value}`;
    }).join("\n")+"\n";
  }
}
