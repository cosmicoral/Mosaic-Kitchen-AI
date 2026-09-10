import type { BilingualDocument } from './legalTypes';
import { CONTROLLER, PRIVACY_EMAIL } from './privacy';

// The wording in section 6 is the one part of this file that is not editorial.
// The Consumer Contracts (Information, Cancellation and Additional Charges)
// Regulations 2013 give a UK consumer 14 days to cancel a digital service,
// and the only way that right is lost is if the customer expressly requests
// immediate performance AND acknowledges losing it. Both halves have to be
// there, and they have to be agreed to before the service starts — which is
// why the checkbox is on the pricing page, before Checkout, and not buried
// here where agreeing to it would be constructive at best.
//
// This text and the checkbox text must say the same thing. See
// web/src/content/waiver.ts, which is where the checkbox reads its wording
// from, and backend/tests/cancellationWaiver.test.ts, which pins the version.

export const termsDocument: BilingualDocument = {
  version: '2026-09',

  en: {
    title: 'Terms of Service',
    updated: 'Last updated: September 2026',
    intro: [
      {
        kind: 'p',
        text:
          `These terms are the agreement between you and ${CONTROLLER} for the use of Mosaic ` +
          'Kitchen AI. By creating an account you accept them.',
      },
    ],
    sections: [
      {
        heading: '1. What the service is',
        blocks: [
          {
            kind: 'p',
            text:
              'Mosaic Kitchen AI generates weekly meal plans, shopping lists and dish suggestions ' +
              'from information you give it about your household, your dietary requirements and ' +
              'what is already in your kitchen. Plans are produced by an AI language model.',
          },
          {
            kind: 'p',
            text:
              'Features described as requiring the iOS app are not available yet. Where the app says ' +
              'so, it means it.',
          },
        ],
      },
      {
        heading: '2. Meal plans are suggestions, not advice',
        blocks: [
          {
            kind: 'note',
            text:
              'Read this one. Meal plans, ingredient lists and cooking steps are generated ' +
              'automatically and are not checked by a person before you see them. Check every ' +
              'ingredient yourself before you cook or eat it. If anyone in your household has a food ' +
              'allergy or intolerance, do not rely on this service to keep an allergen out of a meal ' +
              '— read the label on everything you buy.',
          },
          {
            kind: 'p',
            text:
              'Nothing the service produces is medical, nutritional or dietary advice. Cooking times, ' +
              'temperatures and food safety guidance in a generated recipe may be wrong. You are ' +
              'responsible for cooking food safely. Estimated costs are estimates and will not match ' +
              'what you actually pay.',
          },
          {
            kind: 'p',
            text:
              'If you are managing a medical condition through your diet, talk to a doctor or a ' +
              'registered dietitian. This is a planning tool, not a clinician.',
          },
        ],
      },
      {
        heading: '3. Your account',
        blocks: [
          {
            kind: 'ul',
            items: [
              'You must be 18 or over to hold an account.',
              'Give accurate information, and keep your password to yourself. You are responsible for what happens under your account.',
              'One account per person. A Plus or Pro plan covers your own household, not a group of unrelated people sharing a login.',
              'Tell us promptly if you think someone else has got into your account.',
            ],
          },
        ],
      },
      {
        heading: '4. Plans and payment',
        blocks: [
          {
            kind: 'p',
            text:
              'The Free plan costs nothing and has monthly allowances, shown on the pricing page. ' +
              'Plus and Pro are paid subscriptions billed monthly or yearly in advance. Prices are ' +
              'shown in pounds sterling and include VAT where it applies.',
          },
          {
            kind: 'p',
            text:
              'Payments are taken by Stripe. We never see or store your card details. Your ' +
              'subscription renews automatically at the end of each period until you cancel it.',
          },
          {
            kind: 'p',
            text:
              'Allowances reset monthly. Unused allowance does not carry over. We may change prices, ' +
              'but not for a period you have already paid for, and we will tell you before a change ' +
              'takes effect on your renewal.',
          },
        ],
      },
      {
        heading: '5. Cancelling',
        blocks: [
          {
            kind: 'p',
            text:
              'You can cancel at any time from the subscription page. Cancelling stops the next ' +
              'renewal; your plan keeps working until the end of the period you have already paid ' +
              'for, and it is not refunded pro rata.',
          },
          {
            kind: 'p',
            text:
              'You can delete your account at any time from Settings. Deleting the account cancels ' +
              'the subscription first, so you cannot keep being charged for something you have ' +
              'deleted.',
          },
        ],
      },
      {
        heading: '6. Your 14-day cancellation right',
        blocks: [
          {
            kind: 'p',
            text:
              'As a consumer in the UK you normally have 14 days to cancel a contract for a digital ' +
              'service and get your money back, without giving a reason. This is the Consumer ' +
              'Contracts Regulations 2013.',
          },
          {
            kind: 'note',
            text:
              'That right can be given up, and before checkout we ask you to do so explicitly. ' +
              'Ticking the box means you are asking us to start your subscription straight away, ' +
              'and that you understand you lose the right to cancel for a refund once we have. We ' +
              'record the date, the wording you agreed to and the language you read it in.',
          },
          {
            kind: 'p',
            text:
              'We ask because the service has only one behaviour: your plan is active the moment ' +
              'payment succeeds. If you would rather keep your 14-day right, do not tick the box — ' +
              `email ${PRIVACY_EMAIL} instead and we will arrange a start date after the 14 days ` +
              'have passed. We handle that by hand, so allow us a couple of days.',
          },
          {
            kind: 'p',
            text:
              'This does not affect your other legal rights. If the service is faulty, not as ' +
              'described, or not supplied with reasonable care and skill, the Consumer Rights Act ' +
              '2015 still applies and nothing here limits it.',
          },
          {
            kind: 'p',
            text:
              `To exercise a cancellation right, email ${PRIVACY_EMAIL}. You do not have to use a ` +
              'particular form of words.',
          },
        ],
      },
      {
        heading: '7. What you may not do',
        blocks: [
          {
            kind: 'ul',
            items: [
              'Resell, redistribute or make the service available to people outside your household.',
              'Scrape it, automate it, or try to extract the generated content in bulk.',
              'Attempt to get the AI to produce content unrelated to cooking, or content that is illegal or harmful.',
              'Try to get round the plan allowances, including by creating multiple free accounts.',
              'Interfere with the service, probe it for vulnerabilities without asking us first, or attempt to access other people\'s data.',
            ],
          },
          {
            kind: 'p',
            text:
              'We can suspend or close an account that does these things. Where it is proportionate ' +
              'we will warn first and refund the unused part of a paid period.',
          },
        ],
      },
      {
        heading: '8. Your content, and ours',
        blocks: [
          {
            kind: 'p',
            text:
              'What you put in — your profile, pantry, notes and lists — stays yours. You give us ' +
              'permission to process it to run the service, and nothing more. We do not use it to ' +
              'train AI models.',
          },
          {
            kind: 'p',
            text:
              'Meal plans generated for you are yours to use, including for commercial purposes. ' +
              'Because they are produced by a model from a prompt, we cannot promise they are ' +
              'original or that a similar plan has not been generated for someone else.',
          },
          {
            kind: 'p',
            text:
              'The software, the interface, the name and the branding remain ours.',
          },
        ],
      },
      {
        heading: '9. Availability',
        blocks: [
          {
            kind: 'p',
            text:
              'We do not promise the service will be uninterrupted. It depends on external providers ' +
              '— a database host, an AI provider, a payment processor — and any of them can have an ' +
              'outage that we cannot fix. We will restore service as soon as we reasonably can.',
          },
          {
            kind: 'p',
            text:
              'If a paid feature is unavailable for a long enough period to matter, contact us and we ' +
              'will sort out a refund or a credit.',
          },
        ],
      },
      {
        heading: '10. Liability',
        blocks: [
          {
            kind: 'p',
            text:
              'Nothing in these terms limits our liability for death or personal injury caused by ' +
              'negligence, for fraud, or for anything else that cannot be limited by law. That ' +
              'includes your rights under the Consumer Rights Act 2015.',
          },
          {
            kind: 'p',
            text:
              'Subject to that, and because this is a planning tool rather than a professional ' +
              'service, our total liability to you for any claim is limited to the amount you paid us ' +
              'in the twelve months before it arose. We are not liable for losses that were not ' +
              'reasonably foreseeable.',
          },
        ],
      },
      {
        heading: '11. Changes and ending',
        blocks: [
          {
            kind: 'p',
            text:
              'We may change these terms. If a change materially affects you we will tell you before ' +
              'it takes effect, and you can cancel if you do not accept it.',
          },
          {
            kind: 'p',
            text:
              'We may close an account that has broken these terms, or withdraw the service ' +
              'altogether with reasonable notice and a refund of anything paid for a period not yet ' +
              'delivered.',
          },
        ],
      },
      {
        heading: '12. Law, and complaints',
        blocks: [
          {
            kind: 'p',
            text:
              'These terms are governed by the law of England and Wales, and the courts of England ' +
              'and Wales have jurisdiction. If you live in Scotland or Northern Ireland you can also ' +
              'bring proceedings where you live.',
          },
          {
            kind: 'p',
            text:
              `Complaints go to ${PRIVACY_EMAIL} and we will reply. For a data protection complaint ` +
              'you can also go straight to the Information Commissioner\'s Office at ico.org.uk.',
          },
        ],
      },
    ],
  },

  zh: {
    title: '服务条款',
    updated: '最后更新：2026 年 9 月',
    intro: [
      {
        kind: 'p',
        text:
          `本条款是你与 ${CONTROLLER} 之间关于使用 Mosaic Kitchen AI 的协议。创建账户即表示你接受本条款。`,
      },
    ],
    sections: [
      {
        heading: '一、本服务是什么',
        blocks: [
          {
            kind: 'p',
            text:
              'Mosaic Kitchen AI 根据你提供的家庭情况、饮食要求和厨房现有食材，生成每周餐单、购物清单' +
              '和菜品建议。餐单由 AI 语言模型生成。',
          },
          {
            kind: 'p',
            text:
              '标注为需要 iOS 应用的功能目前尚不可用。应用里这样写，就是这个意思。',
          },
        ],
      },
      {
        heading: '二、餐单是建议，不是专业意见',
        blocks: [
          {
            kind: 'note',
            text:
              '这一条请务必读。餐单、配料表和烹饪步骤是自动生成的，在你看到之前没有经过人工核对。' +
              '下厨或食用前请自行核对每一样配料。如果家中有人有食物过敏或不耐受，请不要依赖本服务来' +
              '排除某种致敏原——请阅读你购买的每一件商品的标签。',
          },
          {
            kind: 'p',
            text:
              '本服务生成的任何内容都不构成医疗、营养或膳食建议。生成菜谱中的烹饪时间、温度和食品安全' +
              '提示都可能是错的，安全烹饪的责任在你。预估花费只是估算，与你的实际支出不会一致。',
          },
          {
            kind: 'p',
            text:
              '如果你正在通过饮食管理某种疾病，请咨询医生或注册营养师。这是一个规划工具，不是临床人员。',
          },
        ],
      },
      {
        heading: '三、你的账户',
        blocks: [
          {
            kind: 'ul',
            items: [
              '你必须年满 18 岁才能持有账户。',
              '请提供准确信息，并妥善保管密码。你的账户下发生的一切由你负责。',
              '每人一个账户。Plus 或 Pro 方案覆盖你自己的家庭，不适用于一群互不相关的人共用一个登录。',
              '如果你认为有人进入了你的账户，请及时告知我们。',
            ],
          },
        ],
      },
      {
        heading: '四、方案与付款',
        blocks: [
          {
            kind: 'p',
            text:
              '免费方案不收费，有每月额度，详见价格页。Plus 和 Pro 是付费订阅，按月或按年预先扣款。' +
              '价格以英镑显示，在适用增值税的情况下已含税。',
          },
          {
            kind: 'p',
            text:
              '付款由 Stripe 处理。我们从不查看或存储你的银行卡信息。你的订阅会在每个周期结束时自动' +
              '续订，直到你取消为止。',
          },
          {
            kind: 'p',
            text:
              '额度按月重置，未用完的部分不结转。我们可能调整价格，但不会影响你已支付的周期，' +
              '且会在变更对你的续订生效之前告知你。',
          },
        ],
      },
      {
        heading: '五、取消订阅',
        blocks: [
          {
            kind: 'p',
            text:
              '你可以随时在订阅页面取消。取消会停止下一次续订；在你已支付的周期结束前，方案继续有效，' +
              '且不按比例退款。',
          },
          {
            kind: 'p',
            text:
              '你可以随时在「设置」中删除账户。删除账户会先取消订阅，以确保你不会为已删除的东西继续被扣款。',
          },
        ],
      },
      {
        heading: '六、你的 14 天取消权',
        blocks: [
          {
            kind: 'p',
            text:
              '作为英国消费者，你通常有 14 天时间取消数字服务合同并拿回款项，且无需说明理由。' +
              '这来自《2013 年消费者合同条例》。',
          },
          {
            kind: 'note',
            text:
              '这项权利可以放弃，我们会在结账前明确请你作出选择。勾选该选项即表示你要求我们立即开通' +
              '订阅，并且你明白一旦开通即失去要求退款的取消权。我们会记录日期、你所同意的措辞，' +
              '以及你当时阅读的语言。',
          },
          {
            kind: 'p',
            text:
              '之所以要问，是因为本服务只有一种行为：付款成功的那一刻你的方案即生效。如果你希望保留' +
              `14 天取消权，请不要勾选——改为发邮件至 ${PRIVACY_EMAIL}，我们会为你安排 14 天期满后的` +
              '开通日期。这一步由人工处理，请留出一两天时间。',
          },
          {
            kind: 'p',
            text:
              '这不影响你的其他法定权利。如果服务存在缺陷、与描述不符，或未以合理的谨慎和技能提供，' +
              '《2015 年消费者权利法》仍然适用，本条款不对其作任何限制。',
          },
          {
            kind: 'p',
            text:
              `如需行使取消权，请发邮件至 ${PRIVACY_EMAIL}。你不需要使用特定的措辞。`,
          },
        ],
      },
      {
        heading: '七、不得从事的行为',
        blocks: [
          {
            kind: 'ul',
            items: [
              '转售、再分发本服务，或将其提供给你家庭以外的人使用。',
              '抓取、自动化调用，或试图批量提取生成内容。',
              '试图诱导 AI 生成与烹饪无关的内容，或违法、有害的内容。',
              '试图规避方案额度，包括批量创建免费账户。',
              '干扰服务、未经我们同意探测漏洞，或试图访问他人数据。',
            ],
          },
          {
            kind: 'p',
            text:
              '我们可以暂停或关闭有上述行为的账户。在相称的情况下，我们会先警告，并退还已付费周期中' +
              '未使用的部分。',
          },
        ],
      },
      {
        heading: '八、你的内容与我们的内容',
        blocks: [
          {
            kind: 'p',
            text:
              '你输入的内容——个人资料、食材库、备注和清单——仍然属于你。你授权我们处理这些内容以运行' +
              '服务，仅此而已。我们不会用它训练 AI 模型。',
          },
          {
            kind: 'p',
            text:
              '为你生成的餐单归你使用，包括商业用途。由于它们是模型根据提示词生成的，我们无法保证其' +
              '原创性，也无法保证没有为别人生成过相似的餐单。',
          },
          {
            kind: 'p',
            text: '软件、界面、名称和品牌标识仍归我们所有。',
          },
        ],
      },
      {
        heading: '九、可用性',
        blocks: [
          {
            kind: 'p',
            text:
              '我们不承诺服务不会中断。它依赖外部服务商——数据库托管、AI 服务、支付处理——其中任何一方' +
              '发生故障，我们都无法修复。我们会在合理范围内尽快恢复服务。',
          },
          {
            kind: 'p',
            text:
              '如果某项付费功能不可用的时间长到有实质影响，请联系我们，我们会安排退款或抵扣。',
          },
        ],
      },
      {
        heading: '十、责任',
        blocks: [
          {
            kind: 'p',
            text:
              '本条款中的任何内容都不限制我们对因疏忽导致的死亡或人身伤害、欺诈，以及其他法律不允许' +
              '限制的事项所承担的责任。这包括你在《2015 年消费者权利法》下的权利。',
          },
          {
            kind: 'p',
            text:
              '在此前提下，鉴于本产品是规划工具而非专业服务，我们对你就任何主张承担的责任总额，' +
              '以该主张发生前十二个月内你向我们支付的金额为上限。我们不对不可合理预见的损失承担责任。',
          },
        ],
      },
      {
        heading: '十一、变更与终止',
        blocks: [
          {
            kind: 'p',
            text:
              '我们可能修改本条款。如果某项修改对你有实质影响，我们会在其生效前告知你；' +
              '你如果不接受，可以取消订阅。',
          },
          {
            kind: 'p',
            text:
              '我们可以关闭违反本条款的账户，也可以在合理通知并退还已付但尚未提供的服务费用后，' +
              '整体停止服务。',
          },
        ],
      },
      {
        heading: '十二、适用法律与投诉',
        blocks: [
          {
            kind: 'p',
            text:
              '本条款受英格兰和威尔士法律管辖，英格兰和威尔士法院具有管辖权。如果你居住在苏格兰或' +
              '北爱尔兰，你也可以在居住地提起诉讼。',
          },
          {
            kind: 'p',
            text:
              `投诉请发送至 ${PRIVACY_EMAIL}，我们会回复。涉及数据保护的投诉，你也可以直接联系英国` +
              '信息专员办公室（ICO），网址 ico.org.uk。',
          },
        ],
      },
    ],
  },
};
