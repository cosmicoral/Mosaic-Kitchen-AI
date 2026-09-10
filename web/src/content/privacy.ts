import type { BilingualDocument } from './legalTypes';

// Every factual claim here is checkable against docs/data-protection.md, which
// is itself derived from the migrations rather than from memory. Nothing in
// this notice describes a control that is not in the code — a privacy notice
// that promises a retention job nobody wrote is worse than no notice, because
// it is a written misrepresentation rather than an omission.
//
// Where the honest answer is "we keep it until you delete your account", that
// is what it says.

export const CONTROLLER = 'Gethen Field Labs';
export const PRIVACY_EMAIL = 'privacy@gethenfieldlabs.com';

export const privacyNotice: BilingualDocument = {
  version: '2026-09',

  en: {
    title: 'Privacy Notice',
    updated: 'Last updated: September 2026',
    intro: [
      {
        kind: 'p',
        text:
          `Mosaic Kitchen AI is operated by ${CONTROLLER}. This notice explains what personal ` +
          'data the service collects, why, who it is shared with, and what you can do about it. ' +
          `${CONTROLLER} is the data controller. You can reach us at ${PRIVACY_EMAIL}.`,
      },
      {
        kind: 'p',
        text:
          'It is written to describe what the software actually does. If you find something here ' +
          'that does not match your experience of the product, tell us — that is a bug in one of ' +
          'the two.',
      },
    ],
    sections: [
      {
        heading: '1. What we collect',
        blocks: [
          {
            kind: 'table',
            head: ['Data', 'Why we have it'],
            rows: [
              ['Email address', 'To identify your account and contact you about it'],
              ['Password', 'Stored only as a bcrypt hash. We cannot read it or recover it'],
              ['Google account identifier', 'Only if you choose to sign in with Google'],
              ['Profile photo', 'Only if you upload one. Location and camera data are stripped from the image before it is stored'],
              ['Household composition', 'Numbers of adults, teenagers, children and toddlers, so portions and budget are right'],
              ['Dietary requirements and ingredients you avoid', 'So generated meal plans do not contain them'],
              ['Cuisines and regional styles you cook', 'So the plans are food you actually eat'],
              ['Weekly food budget', 'So the plans cost roughly what you can spend'],
              ['Anything you type in the notes field', 'It is passed to the meal planner as written'],
              ['Pantry contents, quantities and expiry dates', 'For expiry alerts, shopping lists and cooking from what you already have'],
              ['Shopping list items', 'To build and keep your list'],
              ['Generated meal plans', 'So you can read them again, and read them in the other language'],
              ['Subscription status and Stripe customer reference', 'To know which plan you are on'],
              ['Per-account record of AI calls and their cost', 'To enforce the plan allowances and to detect abuse'],
              ['Session records and IP addresses in server logs', 'To keep you signed in and to keep the service secure'],
            ],
          },
        ],
      },
      {
        heading: '2. The sensitive part, and why we ask separately',
        blocks: [
          {
            kind: 'p',
            text:
              'Some of what a meal planner needs is special category data under Article 9 of the UK ' +
              'GDPR. Ingredients you avoid can reveal an allergy or a medical condition. A low-salt ' +
              'or low-sugar setting can reveal a managed condition. A combination of cuisines and ' +
              'religious exclusions can reveal a religious belief — whether or not you ever used ' +
              'those words.',
          },
          {
            kind: 'p',
            text:
              'The law prohibits processing that data unless you give explicit consent. That is why ' +
              'there is a separate, unticked checkbox for it when you set up your profile, with its ' +
              'own wording, rather than it being folded into accepting the terms. We record the date ' +
              'you gave it and the version of this notice it was given against.',
          },
          {
            kind: 'p',
            text:
              'You can withdraw it at any time by deleting your profile or your account. Without it ' +
              'we cannot generate meal plans, because the planner has nothing to plan around.',
          },
        ],
      },
      {
        heading: '3. Our lawful basis',
        blocks: [
          {
            kind: 'table',
            head: ['What we do with it', 'Basis'],
            rows: [
              ['Run your account, sign you in, keep your session', 'Performance of a contract'],
              ['Generate meal plans from your profile', 'Contract, plus your explicit consent for the sensitive parts (Article 9(2)(a))'],
              ['Pantry, shopping lists, expiry alerts', 'Contract, plus your explicit consent'],
              ['Take payment', 'Contract, and legal obligations around record keeping'],
              ['Meter AI usage per account', 'Our legitimate interest in preventing abuse and staying solvent'],
              ['Security logging and session cleanup', 'Our legitimate interest in keeping the service secure'],
            ],
          },
        ],
      },
      {
        heading: '4. Who else sees it',
        blocks: [
          {
            kind: 'table',
            head: ['Who', 'What they get, and where they are'],
            rows: [
              ['Neon', 'The database holding everything in section 1. Hosted in London, United Kingdom'],
              ['Hetzner', 'The server the application runs on, in Helsinki, Finland. All requests pass through it'],
              ['Vercel', 'Serves the website itself, and sees request metadata including your IP address'],
              ['OpenAI', 'Household composition, dietary requirements, pantry contents and budget, to generate and translate plans. United States'],
              ['Stripe', 'Your email and billing address, and your card details, which never reach our servers. United States and Ireland'],
              ['Cloudflare R2', 'Your profile photo, if you upload one'],
              ['Google', 'Only an account identifier, and only if you sign in with Google. United States'],
            ],
          },
          {
            kind: 'p',
            text:
              'We do not sell your data, we do not share it for advertising, and there is no ' +
              'advertising or third-party analytics in this product.',
          },
          {
            kind: 'note',
            text:
              'Worth knowing: what we send to OpenAI is pseudonymous. The meal planner receives your ' +
              'household and dietary information but never your email address and never your account ' +
              'identifier. Nothing in a prompt identifies you by itself.',
          },
          {
            kind: 'p',
            text:
              'Your data is stored in the United Kingdom and processed on a server in Finland, which ' +
              'is covered by UK adequacy. OpenAI, Stripe and Google are in the United States, and ' +
              'those transfers rely on each provider\'s standard data protection terms incorporating ' +
              'the UK International Data Transfer Addendum.',
          },
        ],
      },
      {
        heading: '5. How long we keep it',
        blocks: [
          {
            kind: 'p',
            text:
              'Your account data — profile, pantry, shopping list and meal plans — is kept for as ' +
              'long as your account exists, because the product is the accumulated picture of your ' +
              'kitchen and it stops working if we throw it away.',
          },
          {
            kind: 'p',
            text:
              'When you delete your account it is deleted, not archived and not flagged as hidden. ' +
              'Your subscription is cancelled first so you cannot keep being charged, your profile ' +
              'photo is removed from storage, and the account row and everything linked to it are ' +
              'deleted from the database. Login sessions expire on their own and are cleaned up.',
          },
          {
            kind: 'p',
            text:
              'Stripe keeps payment and invoice records independently of us, for as long as tax and ' +
              'accounting law requires them to.',
          },
        ],
      },
      {
        heading: '6. How it is protected',
        blocks: [
          {
            kind: 'ul',
            items: [
              'Passwords are hashed with bcrypt at cost 12, and are never stored or logged in a readable form.',
              'Session cookies are HttpOnly, so page scripts cannot read them, and are sent over HTTPS only.',
              'All database queries are parameterised.',
              'Sign-in and other sensitive routes are rate limited.',
              'Uploaded photos are re-encoded, which removes embedded location and camera information.',
              'Traffic between your browser and the service is encrypted with TLS.',
            ],
          },
        ],
      },
      {
        heading: '7. Your rights',
        blocks: [
          {
            kind: 'p',
            text:
              'Under the UK GDPR you can ask for a copy of your data, correct it, delete it, take it ' +
              'elsewhere, object to some processing, and withdraw consent. Three of those you can do ' +
              'yourself, immediately, without asking us:',
          },
          {
            kind: 'ul',
            items: [
              'Access and portability — Settings has an export that returns your account, profile, pantry, shopping list and meal plans as a JSON file.',
              'Rectification — your profile is editable in full at any time.',
              'Erasure — Settings has a delete-account action, and it is a real deletion.',
            ],
          },
          {
            kind: 'p',
            text:
              `For anything else, or if one of those does not work, email ${PRIVACY_EMAIL}. We will ` +
              'respond within one month, which is what the law allows us.',
          },
          {
            kind: 'p',
            text:
              'If you are not satisfied with how we have handled it you can complain to the ' +
              'Information Commissioner\'s Office at ico.org.uk, or by calling 0303 123 1113. You do ' +
              'not have to come to us first.',
          },
        ],
      },
      {
        heading: '8. Cookies',
        blocks: [
          {
            kind: 'p',
            text:
              'We set one cookie, for your login session. It is strictly necessary for the service ' +
              'to work, which is why there is no cookie banner asking you to accept it — there is ' +
              'nothing to opt out of. We do not use tracking or advertising cookies. Your language ' +
              'choice is stored in your own browser and never sent to us as a cookie.',
          },
        ],
      },
      {
        heading: '9. Children',
        blocks: [
          {
            kind: 'p',
            text:
              'This service is for adults running a household. It is not intended for children under ' +
              '13, and we do not knowingly create accounts for them. You can tell us how many ' +
              'children live in your household so that portions are right; that is a number, and we ' +
              'do not collect any information that identifies them.',
          },
        ],
      },
      {
        heading: '10. Changes',
        blocks: [
          {
            kind: 'p',
            text:
              'If we change this notice in a way that affects the consent you gave, we will ask for ' +
              'it again rather than assuming the old one still covers it. The version is recorded ' +
              'with your consent so that we can tell.',
          },
        ],
      },
    ],
  },

  zh: {
    title: '隐私声明',
    updated: '最后更新：2026 年 9 月',
    intro: [
      {
        kind: 'p',
        text:
          `Mosaic Kitchen AI 由 ${CONTROLLER} 运营。本声明说明本服务收集哪些个人数据、为什么收集、` +
          `会交给谁，以及你可以对此做什么。${CONTROLLER} 是数据控制者，联系方式为 ${PRIVACY_EMAIL}。`,
      },
      {
        kind: 'p',
        text:
          '本声明描述的是软件实际的行为。如果你发现这里写的和你使用产品的体验对不上，请告诉我们——' +
          '那说明两者之中有一个出了问题。',
      },
    ],
    sections: [
      {
        heading: '一、我们收集什么',
        blocks: [
          {
            kind: 'table',
            head: ['数据', '为什么需要'],
            rows: [
              ['电子邮箱', '用于识别你的账户并就账户事宜联系你'],
              ['密码', '仅以 bcrypt 哈希形式存储。我们无法读取，也无法找回'],
              ['Google 账号标识', '仅在你选择用 Google 登录时'],
              ['头像照片', '仅在你上传时。图片中的位置和相机信息会在存储前被清除'],
              ['家庭人口构成', '成人、青少年、儿童、幼儿的人数，用于确定分量和预算'],
              ['饮食要求与忌口食材', '确保生成的餐单不包含这些'],
              ['你会做的菜系与地方风味', '确保餐单是你真正会吃的东西'],
              ['每周食材预算', '确保餐单的花费大致在你能承受的范围内'],
              ['你在备注栏填写的任何内容', '会原样传给餐单生成'],
              ['食材库内容、数量与保质期', '用于保质期提醒、购物清单，以及用现有食材做菜'],
              ['购物清单条目', '用于生成和保存你的清单'],
              ['已生成的餐单', '让你可以再次查看，以及用另一种语言查看'],
              ['订阅状态与 Stripe 客户编号', '用于判断你当前的方案'],
              ['每个账户的 AI 调用记录与花费', '用于执行方案额度限制和识别滥用'],
              ['会话记录与服务器日志中的 IP 地址', '用于保持登录状态和服务安全'],
            ],
          },
        ],
      },
      {
        heading: '二、敏感的那一部分，以及为什么单独征求同意',
        blocks: [
          {
            kind: 'p',
            text:
              '餐单规划所需的部分信息，属于英国 GDPR 第 9 条下的特殊类别数据。你忌口的食材可能透露过敏' +
              '或某种健康状况；低盐、低糖设置可能透露正在管理的疾病；菜系偏好与宗教性忌口的组合可能透露' +
              '宗教信仰——无论你是否曾经用过这些词。',
          },
          {
            kind: 'p',
            text:
              '法律原则上禁止处理这类数据，除非你给出明示同意。因此在你设置个人资料时，会有一个单独的、' +
              '默认不勾选的选项，措辞独立，而不是并入「同意服务条款」。我们会记录你给出同意的日期，' +
              '以及当时对应的本声明版本。',
          },
          {
            kind: 'p',
            text:
              '你可以随时通过删除个人资料或账户撤回同意。没有这项同意我们无法生成餐单，因为规划器没有' +
              '任何可以依据的信息。',
          },
        ],
      },
      {
        heading: '三、我们的合法性基础',
        blocks: [
          {
            kind: 'table',
            head: ['我们用它做什么', '基础'],
            rows: [
              ['运行账户、登录、维持会话', '履行合同'],
              ['根据你的资料生成餐单', '合同，敏感部分另加你的明示同意（第 9(2)(a) 条）'],
              ['食材库、购物清单、保质期提醒', '合同，另加你的明示同意'],
              ['收取款项', '合同，以及记录保存方面的法定义务'],
              ['按账户计量 AI 使用量', '我们在防止滥用和维持运营方面的正当利益'],
              ['安全日志与会话清理', '我们在保障服务安全方面的正当利益'],
            ],
          },
        ],
      },
      {
        heading: '四、还有谁会接触到',
        blocks: [
          {
            kind: 'table',
            head: ['谁', '拿到什么，位于哪里'],
            rows: [
              ['Neon', '存放第一节全部内容的数据库。位于英国伦敦'],
              ['Hetzner', '运行应用的服务器，位于芬兰赫尔辛基。所有请求都经过它'],
              ['Vercel', '提供网站本身，会看到包括你的 IP 地址在内的请求元数据'],
              ['OpenAI', '家庭构成、饮食要求、食材库内容和预算，用于生成和翻译餐单。位于美国'],
              ['Stripe', '你的邮箱和账单地址，以及银行卡信息——后者从不经过我们的服务器。位于美国和爱尔兰'],
              ['Cloudflare R2', '你的头像照片，如果你上传了的话'],
              ['Google', '仅账号标识，且仅在你使用 Google 登录时。位于美国'],
            ],
          },
          {
            kind: 'p',
            text:
              '我们不出售你的数据，不为广告目的共享数据，本产品中没有任何广告或第三方分析工具。',
          },
          {
            kind: 'note',
            text:
              '值得说明：发给 OpenAI 的内容是假名化的。餐单生成会收到你的家庭构成和饮食信息，' +
              '但绝不包含你的邮箱地址，也绝不包含你的账户标识。提示词中没有任何内容能单独指认你。',
          },
          {
            kind: 'p',
            text:
              '你的数据存储在英国，并在位于芬兰的服务器上处理——芬兰在英国的充分性认定范围内。' +
              'OpenAI、Stripe 和 Google 位于美国，相关传输依据各服务商纳入英国国际数据传输附录的' +
              '标准数据保护条款。',
          },
        ],
      },
      {
        heading: '五、保留多久',
        blocks: [
          {
            kind: 'p',
            text:
              '你的账户数据——个人资料、食材库、购物清单和餐单——会在你的账户存在期间一直保留，' +
              '因为这个产品的价值正是你厨房的累积画像，删掉它产品就不工作了。',
          },
          {
            kind: 'p',
            text:
              '当你删除账户时，数据是真的被删除，不是归档，也不是标记为隐藏。系统会先取消你的订阅，' +
              '以确保你不会继续被扣款，然后从存储中移除头像，再从数据库中删除账户记录及其所有关联数据。' +
              '登录会话会自行过期并被清理。',
          },
          {
            kind: 'p',
            text:
              'Stripe 会独立于我们保存付款和发票记录，保存期限以税务和会计法律的要求为准。',
          },
        ],
      },
      {
        heading: '六、如何保护',
        blocks: [
          {
            kind: 'ul',
            items: [
              '密码使用 bcrypt（cost 12）哈希存储，绝不以可读形式存储或写入日志。',
              '会话 Cookie 设为 HttpOnly，页面脚本无法读取，且仅通过 HTTPS 传输。',
              '所有数据库查询均使用参数化语句。',
              '登录等敏感接口有速率限制。',
              '上传的照片会被重新编码，这会移除其中嵌入的位置和相机信息。',
              '你的浏览器与服务之间的流量使用 TLS 加密。',
            ],
          },
        ],
      },
      {
        heading: '七、你的权利',
        blocks: [
          {
            kind: 'p',
            text:
              '根据英国 GDPR，你可以要求获取自己数据的副本、更正它、删除它、把它带走、反对某些处理，' +
              '以及撤回同意。其中三项你可以自己立刻完成，不需要问我们：',
          },
          {
            kind: 'ul',
            items: [
              '访问与可携带性——「设置」中有导出功能，会把你的账户、个人资料、食材库、购物清单和餐单导出为 JSON 文件。',
              '更正——个人资料随时可以完整编辑。',
              '删除——「设置」中有删除账户功能，那是真正的删除。',
            ],
          },
          {
            kind: 'p',
            text:
              `其他事项，或者上述功能出了问题，请发邮件到 ${PRIVACY_EMAIL}。我们会在一个月内回复，` +
              '这是法律给我们的期限。',
          },
          {
            kind: 'p',
            text:
              '如果你对我们的处理方式不满意，可以向英国信息专员办公室（ICO）投诉，网址 ico.org.uk，' +
              '电话 0303 123 1113。你不需要先经过我们。',
          },
        ],
      },
      {
        heading: '八、Cookie',
        blocks: [
          {
            kind: 'p',
            text:
              '我们只设置一个 Cookie，用于你的登录会话。它是服务运行的严格必需项，所以没有弹出横幅' +
              '请你「接受」——因为没有可以拒绝的东西。我们不使用追踪或广告 Cookie。你的语言选择保存在' +
              '你自己的浏览器里，不会作为 Cookie 发送给我们。',
          },
        ],
      },
      {
        heading: '九、儿童',
        blocks: [
          {
            kind: 'p',
            text:
              '本服务面向操持家务的成年人，不面向 13 岁以下儿童，我们也不会在知情的情况下为其创建账户。' +
              '你可以告诉我们家里有几个孩子以便确定分量；那只是一个数字，我们不收集任何可以指认他们的信息。',
          },
        ],
      },
      {
        heading: '十、变更',
        blocks: [
          {
            kind: 'p',
            text:
              '如果我们对本声明的修改影响到你此前给出的同意，我们会重新征求，而不是假定旧的同意仍然适用。' +
              '同意记录中保存了版本号，正是为了让我们能够判断这一点。',
          },
        ],
      },
    ],
  },
};
