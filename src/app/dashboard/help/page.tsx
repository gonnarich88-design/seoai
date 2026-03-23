// NOTE: const arrays are declared BEFORE the component to avoid ReferenceError
// (const is not hoisted — declaring after the function that uses them causes a runtime error)

const steps = [
  {
    number: 1,
    title: 'เพิ่มแบรนด์ของคุณ',
    description:
      'ไปที่ Brands → กด Add Brand → ใส่ชื่อแบรนด์และ alias (ชื่อย่อ, ชื่อสินค้า) ที่ AI อาจใช้เรียกแบรนด์คุณ เพิ่มคู่แข่งได้ด้วยโดยปิด "This is my brand"',
  },
  {
    number: 2,
    title: 'เพิ่ม Keyword',
    description:
      'ไปที่ Keywords → กด Add Keyword → ตั้งชื่อ label และเขียน prompt ที่ต้องการให้ AI ตอบ เช่น "แนะนำซอฟต์แวร์ CRM ที่ดีที่สุดสำหรับธุรกิจขนาดเล็ก"',
  },
  {
    number: 3,
    title: 'รัน Check ครั้งแรก',
    description:
      'ไปที่ Keywords → กดปุ่ม "Run Check Now" ระบบจะส่ง prompt ไปถาม ChatGPT, Perplexity และ Gemini (3 ครั้งต่อแพลตฟอร์มเพื่อความแม่นยำ) ใช้เวลาสักครู่',
  },
  {
    number: 4,
    title: 'ดูผลที่ Overview',
    description:
      'เลือก keyword จาก dropdown ด้านซ้าย แล้วไปที่ Overview จะเห็น Visibility Score ว่าแบรนด์คุณถูก AI พูดถึงกี่ % ในแต่ละแพลตฟอร์ม และเทียบกับคู่แข่งอย่างไร',
  },
  {
    number: 5,
    title: 'รับ Alert อัตโนมัติ',
    description:
      'ตั้งค่า SMTP_HOST, SMTP_USER, SMTP_PASS และ ALERT_EMAIL_TO ใน .env เพื่อรับอีเมลเมื่อ visibility เปลี่ยนแปลง ระบบจะส่ง daily check ตามเวลาที่ตั้งไว้ใน CHECK_SCHEDULE_CRON',
  },
];

const pages = [
  {
    icon: '📊',
    name: 'Overview',
    description: 'ดู Visibility Score ของแบรนด์คุณต่อ platform (ChatGPT, Perplexity, Gemini) และตารางเทียบกับคู่แข่ง พร้อมกราฟ trend 7 วัน',
    whenToUse: 'เปิดทุกวันเพื่อเช็ก status',
  },
  {
    icon: '⚔️',
    name: 'Competitors',
    description: 'ตาราง full comparison แสดง visibility score ของทุกแบรนด์ เทียบกันในทุก platform และทุก keyword',
    whenToUse: 'เมื่อต้องการวิเคราะห์คู่แข่งเชิงลึก',
  },
  {
    icon: '📈',
    name: 'Trends',
    description: 'กราฟแสดงการเปลี่ยนแปลง visibility score ตามเวลา กรองตาม brand และ time range (7/30/90 วัน)',
    whenToUse: 'เมื่อต้องการดูแนวโน้มระยะยาว',
  },
  {
    icon: '📁',
    name: 'Archive',
    description: 'ดู AI response เต็มๆ ทุก response ที่เคยได้รับ พร้อม highlight ชื่อแบรนด์ที่ถูกพูดถึง',
    whenToUse: 'เมื่อต้องการอ่านว่า AI พูดอะไรจริงๆ',
  },
  {
    icon: '🔔',
    name: 'Alerts',
    description: 'รายการแจ้งเตือนเมื่อแบรนด์ปรากฏ/หายไปจาก AI response หรือเปลี่ยน rank มี unread badge บน sidebar',
    whenToUse: 'เมื่อได้รับแจ้งเตือนทางอีเมล',
  },
  {
    icon: '🏷️',
    name: 'Keywords',
    description: 'จัดการ prompt ที่ใช้ถาม AI เพิ่ม/แก้ไข/ลบ/toggle active และรัน on-demand check ได้',
    whenToUse: 'เมื่อต้องการเพิ่มหรือแก้ไข prompt',
  },
  {
    icon: '🏢',
    name: 'Brands',
    description: 'จัดการแบรนด์ตัวเองและคู่แข่ง กำหนด alias ที่ AI อาจใช้เรียก เช่น ชื่อย่อหรือชื่อสินค้า',
    whenToUse: 'เมื่อต้องการเพิ่มคู่แข่งหรือแก้ไข alias',
  },
];

export default function HelpPage() {
  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Help & Guide</h2>
      <p className="text-gray-500 mb-8">วิธีการใช้งาน SEO AI Monitor</p>

      {/* Getting Started */}
      <section className="mb-10">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          เริ่มต้นใช้งาน
        </h3>
        <div className="space-y-4">
          {steps.map((step) => (
            <div key={step.number} className="flex gap-4 p-4 bg-white border border-gray-200 rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                {step.number}
              </div>
              <div>
                <p className="font-medium text-gray-900">{step.title}</p>
                <p className="text-sm text-gray-500 mt-1">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Reference */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          แต่ละหน้าทำอะไร
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {pages.map((page) => (
            <div key={page.name} className="p-4 bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{page.icon}</span>
                <span className="font-medium text-gray-900">{page.name}</span>
              </div>
              <p className="text-sm text-gray-500">{page.description}</p>
              <p className="text-xs text-blue-600 mt-2">{page.whenToUse}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
