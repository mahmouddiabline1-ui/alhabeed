import { useEffect, useRef } from "react";
import { CATEGORIES, type CategoryId } from "./catalog";

export function CategoryArtwork({ category }: { category: CategoryId }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const target = canvas.current;
    if (!target) return;
    const config = CATEGORIES[category];
    const image = new Image();
    image.src = `${import.meta.env.BASE_URL}${config.art ?? "category-art-v1.png"}`;
    image.onload = () => paintCard(target, image, config.position, config.size ?? "300% 200%", config.name);
  }, [category]);
  return <canvas ref={canvas} className="category-artwork" width="600" height="750" aria-hidden="true" />;
}

function paintCard(canvas:HTMLCanvasElement,image:HTMLImageElement,position:string,size:string,title:string) {
  const context = canvas.getContext("2d"); if (!context) return;
  const [wide,high] = size.split(" ").map(v => Math.max(1, Math.round(parseFloat(v) / 100)));
  const [px,py] = position.split(" ").map(v => parseFloat(v));
  const column = wide === 1 ? 0 : Math.round((px / 100) * (wide - 1));
  const row = high === 1 ? 0 : Math.round((py / 100) * (high - 1));
  const sw=image.naturalWidth/wide, sh=image.naturalHeight/high;
  context.clearRect(0,0,600,750);
  const scale=Math.max(600/sw,750/sh), dw=sw*scale, dh=sh*scale;
  context.drawImage(image,column*sw,row*sh,sw,sh,(600-dw)/2,(750-dh)/2,dw,dh);
  context.fillStyle="#fff8e9";
  roundedRect(context,42,570,516,116,24); context.fill();
  context.fillStyle="#f05a24"; context.fillRect(72,570,456,8);
  context.fillStyle="#122554"; context.font="800 50px Arial, sans-serif";
  context.textAlign="center"; context.textBaseline="middle"; context.direction="rtl";
  context.fillText(title,300,630,470);
}

function roundedRect(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
  c.beginPath(); c.roundRect(x,y,w,h,r);
}
