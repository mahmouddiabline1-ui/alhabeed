import type { ModeId } from "./types";

export type CategoryId = "egypt"|"history"|"football"|"screen"|"food"|"science";
export interface LocalQuestion { mode:ModeId; category:CategoryId; prompt:string; correct:string; decoys:string[]; explanation:string }
export const CATEGORIES:Record<CategoryId,{name:string;position:string}>={
  egypt:{name:"مصر والقعدة",position:"0% 0%"},history:{name:"تاريخ وغرائب",position:"50% 0%"},football:{name:"كورة وتشجيع",position:"100% 0%"},
  screen:{name:"سينما وتلفزيون",position:"0% 100%"},food:{name:"أكل ومزاج",position:"50% 100%"},science:{name:"علوم ومعلومات",position:"100% 100%"}
};
export const LOCAL_QUESTIONS:LocalQuestion[]=[
  {mode:"habbedha",category:"egypt",prompt:"إيه سبب تسمية حي الزمالك بالاسم ده؟",correct:"نسبة لأكواخ من البوص كانت تُسمّى زمالك",decoys:["نسبة لتاجر تركي اسمه زملق","لأن الخديوي كان بيجمع ضيوفه هناك"],explanation:"يرتبط الاسم بكلمة زمالك التي استُخدمت لأكواخ البوص على الجزيرة."},
  {mode:"habbedha",category:"egypt",prompt:"ليه المصريين بيسموا النقود «فلوس»؟",correct:"لأنها جمع فلس، وهي عملة قديمة",decoys:["من كلمة فرنسية على أول ورقة نقد","لأن التجار كانوا يلفّون العملات"],explanation:"فلوس هي جمع فلس، وهي تسمية نقدية عربية قديمة."},
  {mode:"complete_bluff",category:"egypt",prompt:"اتعمل أول كوبري قصر النيل المتحرك علشان…",correct:"يسمح بمرور المراكب في النيل",decoys:["الخديوي يشوف الأهرامات من القصر","يتحوّل لسوق في الأعياد"],explanation:"صُمم جزء متحرك من الكوبري لمرور الملاحة النهرية."},
  {mode:"true_or_bluff",category:"egypt",prompt:"محطة مصر في الإسكندرية أقدم من محطة مصر في القاهرة.",correct:"صح",decoys:[],explanation:"بدأت السكك الحديدية المصرية بخط الإسكندرية–كفر الزيات في خمسينيات القرن التاسع عشر."},
  {mode:"true_or_bluff",category:"egypt",prompt:"القاهرة اتسمّت رسميًا المنصورية قبل اسم القاهرة.",correct:"صح",decoys:[],explanation:"بدأ جوهر الصقلي بناء المدينة باسم المنصورية قبل شيوع اسم القاهرة."},
  {mode:"habbedha",category:"history",prompt:"ليه كان بعض الرومان بيستخدموا بول الإنسان في المغاسل؟",correct:"الأمونيا فيه كانت تساعد على تنظيف الملابس",decoys:["كان بيمنع سرقة الملابس","كانوا بيصبغوا بيه القماش"],explanation:"الأمونيا الناتجة منه استُخدمت تاريخيًا كمادة تنظيف."},
  {mode:"complete_bluff",category:"history",prompt:"أقصر حرب مسجلة في التاريخ استمرت تقريبًا…",correct:"أقل من ساعة",decoys:["ثلاثة أيام","سبع دقائق بالضبط"],explanation:"الحرب الإنجليزية الزنجبارية سنة 1896 استمرت أقل من ساعة."},
  {mode:"true_or_bluff",category:"history",prompt:"جامعة أكسفورد أقدم من إمبراطورية الأزتك.",correct:"صح",decoys:[],explanation:"بدأ التدريس في أكسفورد قبل تأسيس إمبراطورية الأزتك بقرون."},
  {mode:"habbedha",category:"history",prompt:"إيه وظيفة الـ«مستيقظ» زمان في بريطانيا؟",correct:"يصحّي العمال بخبط الشبابيك",decoys:["يراقب القمر للبحارة","يحرس المصانع من الحرائق"],explanation:"كان الـKnocker-up يوقظ العمال في زمن ما قبل انتشار المنبهات."},
  {mode:"true_or_bluff",category:"football",prompt:"حارس مرمى سجل هدفًا من ضربة مرمى مباشرة في مباراة رسمية.",correct:"صح",decoys:[],explanation:"سُجلت أهداف رسمية من مسافات هائلة بواسطة حراس مرمى."},
  {mode:"habbedha",category:"football",prompt:"ليه بطاقة الحكم الصفراء لونها أصفر؟",correct:"لتكون واضحة بصريًا مثل إشارة التحذير",decoys:["لأن أول حكم اخترعها كان يشجع البرازيل","لأن الورق الأصفر كان الأرخص"],explanation:"استُلهم نظام البطاقات من إشارات المرور: أصفر للتحذير وأحمر للتوقف."},
  {mode:"complete_bluff",category:"football",prompt:"أول كأس عالم اتلعب سنة…",correct:"1930",decoys:["1922","1946"],explanation:"استضافت أوروجواي أول بطولة لكأس العالم سنة 1930."},
  {mode:"true_or_bluff",category:"football",prompt:"ممكن مباراة كرة قدم تنتهي رسميًا من غير ما الفريقين يكملوا 11 لاعب.",correct:"صح",decoys:[],explanation:"القانون يسمح باستكمال اللعب حتى يقل أحد الفريقين عن سبعة لاعبين."},
  {mode:"habbedha",category:"screen",prompt:"ليه أفلام زمان كانت بتحط عدّ تنازلي قبل البداية؟",correct:"لمزامنة أجهزة العرض وتجهيز البكرة",decoys:["لاختبار تركيز الجمهور","كان إعلانًا لرقم دار العرض"],explanation:"قائد الفيلم ساعد العارض على مزامنة وتجهيز التشغيل."},
  {mode:"true_or_bluff",category:"screen",prompt:"الصوت دخل السينما التجارية بعد الصورة المتحركة بسنوات طويلة.",correct:"صح",decoys:[],explanation:"انتشرت الأفلام الصامتة قبل أفلام الصوت المتزامن بسنوات."},
  {mode:"complete_bluff",category:"screen",prompt:"كلمة «كلاكيت» مرتبطة أساسًا بـ…",correct:"مزامنة الصوت مع الصورة",decoys:["إعلان رقم المشهد للجمهور","قياس سرعة الكاميرا"],explanation:"صفقة الكلاكيت تعطي نقطة واضحة لمزامنة الصوت والصورة في المونتاج."},
  {mode:"habbedha",category:"screen",prompt:"ليه خلفيات الأخبار غالبًا لونها أزرق؟",correct:"لأنه يوحي بالثقة ويعطي تباينًا جيدًا",decoys:["لأن الكاميرات لا تسجل الأحمر","تقليدًا لأول قناة فضائية"],explanation:"الأزرق شائع بصريًا لارتباطه بالهدوء والثقة وسهولة التباين."},
  {mode:"habbedha",category:"food",prompt:"ليه الفلفل الحار بيخلّي الإنسان يحس بسخونة؟",correct:"الكابسيسين ينشّط مستقبلات الحرارة",decoys:["يرفع حرارة اللسان فعلًا","يمنع اللعاب من تبريد الفم"],explanation:"الكابسيسين يخدع مستقبلات عصبية تستجيب للحرارة."},
  {mode:"true_or_bluff",category:"food",prompt:"العسل ممكن يفضل صالحًا للأكل لسنين طويلة جدًا لو اتخزن صح.",correct:"صح",decoys:[],explanation:"انخفاض الرطوبة والحموضة يجعلان العسل بيئة صعبة لنمو الميكروبات."},
  {mode:"complete_bluff",category:"food",prompt:"السبب إن البصل يخلّيك تعيط هو إطلاقه…",correct:"مركّب مهيّج يصل للعين",decoys:["بخار حمضي من الماء","حبوب لقاح دقيقة"],explanation:"قطع البصل يطلق مركبًا متطايرًا يهيّج العين فينتج الدمع."},
  {mode:"habbedha",category:"food",prompt:"ليه المشروبات الغازية بتطلع فقاقيع أول ما تفتحها؟",correct:"انخفاض الضغط يحرر ثاني أكسيد الكربون",decoys:["الهواء يدخل ويغلي السائل","السكر يتفاعل مع غطاء العبوة"],explanation:"فتح العبوة يقلل الضغط فيخرج الغاز المذاب على هيئة فقاعات."},
  {mode:"true_or_bluff",category:"science",prompt:"الأخطبوط عنده ثلاثة قلوب.",correct:"صح",decoys:[],explanation:"له ثلاثة قلوب: اثنان للخياشيم وواحد لبقية الجسم."},
  {mode:"true_or_bluff",category:"science",prompt:"الصوت لا ينتقل في الفراغ.",correct:"صح",decoys:[],explanation:"الصوت يحتاج وسطًا ماديًا لنقل الاهتزازات."},
  {mode:"habbedha",category:"science",prompt:"ليه السماء بتبان زرقاء في النهار؟",correct:"الضوء الأزرق يتشتت في الغلاف الجوي أكثر",decoys:["المحيطات بتعكس لونها للسماء","طبقة الأوزون لونها أزرق قوي"],explanation:"جزيئات الهواء تشتت الأطوال الموجية القصيرة، ومنها الأزرق، أكثر."},
  {mode:"complete_bluff",category:"science",prompt:"اليوم على كوكب الزهرة أطول من…",correct:"سنته",decoys:["عشر سنين أرضية","اليوم على المشتري فقط"],explanation:"دوران الزهرة حول نفسه أبطأ من دورانه حول الشمس."},
  {mode:"habbedha",category:"science",prompt:"ليه رواد الفضاء بيبانوا كأنهم طايرين؟",correct:"لأنهم والأجسام حولهم في سقوط حر مستمر",decoys:["لأن الجاذبية تختفي خارج الأرض","لأن المركبة مليانة غاز خفيف"],explanation:"الجاذبية موجودة، لكن المركبة وروادها يسقطون معًا حول الأرض."},
  {mode:"true_or_bluff",category:"science",prompt:"الموز يُعد من التوت علميًا، والفراولة لا.",correct:"صح",decoys:[],explanation:"التصنيف النباتي للثمار يختلف عن الأسماء الشائعة في المطبخ."},
  {mode:"complete_bluff",category:"science",prompt:"أكبر عضو في جسم الإنسان هو…",correct:"الجلد",decoys:["الكبد","الرئة"],explanation:"الجلد هو أكبر أعضاء جسم الإنسان من حيث المساحة والوزن."},
  {mode:"habbedha",category:"history",prompt:"ليه تماثيل يونانية ورومانية كتير مناخيرها مكسورة؟",correct:"لأن الأنف بارز وسهل الكسر مع الزمن",decoys:["كان عقابًا رسميًا لكل تمثال","الفنانين كانوا يتركوها لآخر مرحلة"],explanation:"الأجزاء البارزة كالأطراف والأنف أكثر تعرضًا للكسر والتآكل."},
  {mode:"complete_bluff",category:"egypt",prompt:"أول خط مترو في مصر ربط بين…",correct:"حلوان والمرج",decoys:["رمسيس والعتبة","الجيزة وشبرا"],explanation:"الخط الأول جمع مسار حلوان جنوبًا بالمرج شمالًا على مراحل."}
];
