import type { Question } from "../core/types.js";

// Original, deliberately small development seed. Production content belongs in a reviewed CMS.
export const seedQuestions: Question[] = [
  { id: "eg-h-1", packageId: "egypt_general", mode: "habbedha", prompt: "ما اسم أقدم هرم حجري كامل معروف في مصر؟", correctAnswer: "هرم زوسر المدرج", explanation: "شُيّد في سقارة للملك زوسر خلال الأسرة الثالثة." },
  { id: "eg-h-2", packageId: "egypt_general", mode: "habbedha", prompt: "أي مدينة مصرية عُرفت تاريخيًا باسم راقودة؟", correctAnswer: "الإسكندرية", explanation: "راقودة كانت قرية مصرية قديمة في موقع الإسكندرية." },
  { id: "eg-h-3", packageId: "egypt_general", mode: "habbedha", prompt: "ما المعدن الذي كان يُسمّى في مصر القديمة دموع رع؟", correctAnswer: "الذهب", explanation: "ارتبط الذهب بالشمس والإله رع في التصورات المصرية القديمة." },
  { id: "eg-t-1", packageId: "egypt_general", mode: "true_or_bluff", prompt: "بحيرة قارون تقع تحت مستوى سطح البحر.", correctAnswer: "صح", explanation: "سطح البحيرة أخفض من مستوى البحر." },
  { id: "eg-t-2", packageId: "egypt_general", mode: "true_or_bluff", prompt: "مدينة الأقصر تقع على ساحل البحر المتوسط.", correctAnswer: "هبد", explanation: "الأقصر تقع في جنوب مصر على نهر النيل." },
  { id: "eg-t-3", packageId: "egypt_general", mode: "true_or_bluff", prompt: "السد العالي يقع قرب أسوان.", correctAnswer: "صح", explanation: "بُني السد العالي جنوب مدينة أسوان." },
  { id: "eg-c-1", packageId: "egypt_general", mode: "complete_bluff", prompt: "أُنشئ مقياس النيل في جزيرة الروضة أساسًا من أجل...", correctAnswer: "قياس مستوى فيضان النيل", explanation: "كان القياس يساعد في توقع الزراعة والضرائب." },
  { id: "eg-c-2", packageId: "egypt_general", mode: "complete_bluff", prompt: "يرجع اسم خان الخليلي إلى...", correctAnswer: "الأمير جهاركس الخليلي", explanation: "أنشأ الخان في العصر المملوكي." },
  { id: "eg-c-3", packageId: "egypt_general", mode: "complete_bluff", prompt: "استُخدمت ساعة جامعة القاهرة قديمًا من أجل...", correctAnswer: "إعلان الوقت داخل الحرم", explanation: "هي جزء من برج الجامعة التاريخي." }
];
