import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Locale = 'en' | 'zh';

const STORAGE_KEY = 'mosaic-kitchen-locale';

const zh: Record<string, string> = {
  'English': 'English', '中文': '中文', 'Back': '返回', 'Home': '首页', 'Pantry': '食材库',
  'Shopping': '购物', 'Profile': '个人资料', 'Loading…': '加载中…', 'Try again': '重试',
  'Refresh': '刷新', 'Save': '保存', 'Cancel': '取消', 'Delete': '删除', 'Add Item': '添加食材',
  'Sign In': '登录', 'Sign Out': '退出登录', 'Create Free Account': '创建免费账户',
  'Sign Up': '注册', 'Log In': '登录', 'Logging in…': '正在登录…', 'OR': '或',
  'Your password': '请输入密码', 'Continue with Google': '使用 Google 继续', 'Continue with Apple': '使用 Apple 继续',
  'Continue planning healthier meals, reducing food waste, and saving money.': '继续规划更健康的餐食、减少浪费并节省开支。',
  'Your AI kitchen assistant for multicultural households.': '为多元文化家庭打造的 AI 厨房助手。',
  'New to Mosaic Kitchen AI?': '第一次使用 Mosaic Kitchen AI？',
  'Upgrade to Premium after logging in': '登录后升级高级版',
  'Unlock unlimited meal plans, AI Vision, and smarter pantry insights.': '解锁无限餐单、AI 图像识别和更智能的食材洞察。',
  'View Premium Plans': '查看高级方案', 'Smarter Meal Planning For Multicultural Households': '为多元文化家庭打造的智能餐单规划',
  'Save money. Eat healthier. Reduce food waste. Without giving up the foods you love.': '省钱、吃得更健康、减少食物浪费，同时保留你热爱的家乡味道。',
  'Generate My First Meal Plan': '生成我的第一份餐单', 'Save Money': '节省开支', 'Eat Healthier': '吃得更健康',
  'Waste Less': '减少浪费', 'Reduce unnecessary food purchases and make the most of your ingredients.': '减少不必要的采购，充分利用已有食材。',
  'Personalized meal planning tailored to your lifestyle.': '根据你的生活方式定制餐单。',
  'Track expiry dates and reduce food waste automatically.': '追踪保质期，自动减少食物浪费。',
  'Perfect for': '适合人群', 'International households': '国际化家庭', 'Busy professionals': '忙碌的上班族',
  'Students': '学生', 'Families': '家庭', 'Food lovers': '美食爱好者', 'Unlock AI Kitchen Intelligence': '解锁 AI 厨房智能',
  'AI fridge scanning': 'AI 冰箱识别', 'Smart pantry recognition': '智能食材识别', 'Unlimited meal plans': '无限餐单',
  'Explore Premium': '了解高级版', 'About': '关于', 'Privacy': '隐私', 'Terms': '条款', 'Contact': '联系',
  'Smarter meals start here': '从这里开始更聪明地吃饭',
  'Create a free account and start planning meals that fit your household, budget, and food culture.': '免费注册，开始规划符合家庭人数、预算和饮食文化的餐单。',
  'Pantry tracking': '食材库管理', 'Shopping lists': '购物清单', 'Expiry reminders': '保质期提醒',
  '3 AI meal plans total': '共 3 次 AI 餐单', 'Repeat your password': '再次输入密码',
  'I agree to the Terms of Service and Privacy Policy': '我同意服务条款和隐私政策',
  'Included in Free Account': '免费账户包含', 'Free': '免费', 'Inventory management': '库存管理',
  'English and Chinese support': '中英文支持',
  'Email Address': '电子邮箱', 'Password': '密码', 'Confirm Password': '确认密码',
  'Forgot password?': '忘记密码？', 'Dashboard': '主页', 'Meal Plan': '餐单',
  'Shopping List': '购物清单', 'My Kitchen': '我的厨房', 'Expiry Alerts': '保质期提醒',
  'AI Vision': 'AI 识别', 'Pricing': '价格方案', 'Settings': '设置',
  'Welcome Back': '欢迎回来', 'Let us plan something delicious today.': '今天一起规划一顿美味吧。',
  'Current plan': '当前方案', 'AI Plans Left': '次 AI 餐单可用', 'Upgrade': '升级',
  'What would you like to do today?': '今天想做什么？', 'Generate Meal Plan': '生成餐单',
  'Create a personalized weekly plan.': '创建个性化每周餐单。', 'ingredients': '种食材',
  'items to buy': '项待购买', 'AI Vision Scan': 'AI 图像识别', 'Premium': '高级版',
  'Scan your fridge instantly.': '快速识别冰箱里的食材。', 'Kitchen Insights': '厨房概览',
  'Expiring soon': '即将到期', 'Pantry items': '食材库存', 'Still to buy': '仍需购买',
  'Meals planned': '已规划餐食', 'Recommended For You': '为你推荐', 'Use These Soon': '优先使用',
  'View Pantry': '查看食材库', 'Nothing expires in the next 7 days.': '未来 7 天没有食材到期。',
  'Generate a meal plan to see recommendations here.': '生成餐单后，这里会显示推荐。',
  'Loading your kitchen…': '正在加载你的厨房…', 'Could not load your dashboard': '无法加载主页',
  'Free Account': '免费账户', 'Unlock Unlimited Meal Plans': '解锁无限餐单',
  'Premium from £3.99/month': '高级版每月 £3.99 起', 'Join Mosaic Kitchen AI': '加入 Mosaic Kitchen AI',
  'Create your free account and start planning meals in minutes.': '免费注册，几分钟内开始规划餐食。',
  'Free - No Card Required': '免费，无需银行卡', 'Already have an account?': '已有账户？',
  'Passwords do not match': '两次输入的密码不一致', 'Please meet all password requirements': '请满足全部密码要求',
  'Please accept the Terms of Service to continue': '请先同意服务条款', 'Creating account…': '正在创建账户…',
  'At least 8 characters': '至少 8 个字符', 'One uppercase and one lowercase letter': '至少一个大写和一个小写字母',
  'One number': '至少一个数字', 'One special character': '至少一个特殊字符',
  'Sign in to your kitchen': '登录你的厨房', 'Welcome back to smarter meal planning.': '欢迎回来，继续智能规划餐食。',
  'Signing in…': '正在登录…', 'New to Mosaic Kitchen?': '第一次使用 Mosaic Kitchen？',
  'Food Expiry Alerts': '食材保质期提醒', 'Items already expired or expiring in the next 7 days.': '显示已过期或未来 7 天内到期的食材。',
  'Checking your pantry…': '正在检查食材库…', 'Could not load expiry alerts': '无法加载保质期提醒',
  'Nothing needs attention': '暂时无需处理', 'No pantry items expire in the next 7 days.': '未来 7 天没有食材到期。',
  'Needs attention': '需要处理', 'Quantity not set': '未设置数量', 'Quantity': '数量', 'Category': '分类',
  'Not set': '未设置', 'Use it before it goes to waste': '趁新鲜尽快使用', 'Plan with your pantry': '根据现有食材规划',
  'Meal planning automatically reads this ingredient.': '餐单生成会自动读取这项食材。',
  'Generate a Meal Plan': '生成餐单', 'Freeze or Preserve': '冷冻或保存',
  'Pantry overview': '食材库概览', 'stored': '已存储', 'categories': '个分类',
  'expiring soon': '即将到期', 'Loading your pantry…': '正在加载食材库…',
  'Could not load your pantry': '无法加载食材库', 'Your pantry is empty': '食材库还是空的',
  'Add what you already have and Mosaic can plan around it.': '添加家中现有食材，Mosaic 会据此规划餐单。',
  'Add your first ingredient': '添加第一项食材', 'Expiring Soon': '即将到期', 'See All': '查看全部',
  'Show Less': '收起', 'Use Fresh': '趁新鲜使用', 'Pantry Categories': '食材分类', 'No quantity set': '未设置数量',
  'Add Ingredient': '添加食材', 'Ingredient name': '食材名称', 'Name': '名称', 'Unit': '单位',
  'Expiry date': '到期日期', 'Adding…': '正在添加…', 'Add to Pantry': '加入食材库',
  'Track ingredients, reduce food waste and cook smarter.': '管理食材、减少浪费，更聪明地做饭。',
  'Vegetables': '蔬菜', 'Protein': '蛋白质', 'Grains': '谷物', 'Condiments': '调味品',
  'Frozen': '冷冻食品', 'Dairy': '乳制品', 'Other': '其他', 'Ingredient': '食材',
  'Quantity (optional)': '数量（可选）', 'Unit (optional)': '单位（可选）', 'Expiry date (optional)': '到期日期（可选）',
  'Your Weekly Meal Plan': '你的每周餐单', 'Generate a plan built around your household and pantry.': '根据家庭需求和现有食材生成餐单。',
  'Loading your meal plan…': '正在加载餐单…', 'Could not load your meal plan': '无法加载餐单',
  'No meal plan yet': '还没有餐单', 'Generate your first plan': '生成第一份餐单', 'Generating…': '正在生成…',
  'Regenerate Plan': '重新生成餐单', 'Estimated total': '预计总价', 'Pantry used': '已使用现有食材',
  'Waste reduction tip': '减少浪费建议', 'Breakfast': '早餐', 'Lunch': '午餐', 'Dinner': '晚餐',
  'minutes': '分钟', 'servings': '人份', 'Ingredients': '食材', 'Method': '步骤',
  'Your Meal Plan': '你的餐单', 'plans left this month.': '次本月餐单可用。', 'Loading your plan…': '正在加载餐单…',
  'Building your plan…': '正在生成餐单…', 'Checking your pantry, working around what you avoid, and staying in budget. This usually takes under a minute.': '正在核对食材库、避开忌口并控制预算，通常不到一分钟。',
  'Could not generate a plan': '无法生成餐单', 'Set up preferences': '设置偏好', 'See Premium plans': '查看高级方案',
  'No plan yet': '还没有餐单', 'Generate one and we will build it around what is already in your kitchen.': '生成一份餐单，我们会优先使用你家里已有的食材。',
  'No plans left this month': '本月额度已用完', 'Generate my plan': '生成我的餐单', 'AI Summary': 'AI 摘要',
  'meals': '餐', 'cuisines': '种菜系', 'from pantry': '来自食材库', 'Estimated cost': '预计费用',
  'Your budget': '你的预算', 'Already owned': '已有食材', 'Tip': '建议', 'Daily Meals': '每日餐食',
  'Regenerate': '重新生成', 'meal': '餐', 'Hide recipe': '收起食谱', 'Show recipe': '查看食谱',
  'Have it': '家中已有', 'Generate Shopping List': '生成购物清单',
  'Build Shopping List': '生成购物清单', 'Loading your shopping list…': '正在加载购物清单…',
  'Could not load your shopping list': '无法加载购物清单', 'Your shopping list is empty': '购物清单还是空的',
  'Generate from Meal Plan': '根据餐单生成', 'Clear checked': '清除已勾选', 'Add an item': '添加一项',
  'items': '项', 'checked': '已勾选', 'Profile & Preferences': '个人资料与偏好',
  'Your Shopping List': '你的购物清单', 'Built from your meal plan, minus what you already have.': '根据餐单生成，并自动扣除家中已有食材。',
  'Loading your list…': '正在加载购物清单…', 'Could not load your list': '无法加载购物清单',
  'Could not build your list': '无法生成购物清单', 'Generate a meal plan first': '请先生成餐单',
  'Nothing on the list yet': '购物清单还是空的', 'Build one from your meal plan, or add items yourself.': '可以根据餐单生成，也可以手动添加。',
  'Build from my meal plan': '根据我的餐单生成', 'Progress': '进度', 'still to get': '项仍需购买',
  'Categories': '分类', 'Rebuilding…': '正在重新生成…', 'Rebuild': '重新生成', 'No amount set': '未设置数量',
  // Used between two counts ("3 of 46"), which is why it is a bare word rather
  // than part of a longer phrase.
  'of': '/',
  'Removed': '已删除', 'Undo': '撤销', 'Could not undo': '撤销失败',
  'Add to pantry': '加入食材库',
  'added to your pantry': '项已加入食材库', 'Could not add to pantry': '加入食材库失败',
  'Just clear checked': '仅清除已勾选', 'Could not remove': '删除失败',
  'items cleared': '项已清除',
  // Extras
  'Fruit, snacks and dessert': '水果、零食和甜点',
  'Off by default. Whatever you pick gets its ingredients added to the shopping list.':
    '默认关闭。勾选后其食材会自动加入购物清单。',
  'Fruit': '水果', 'Snacks': '零食', 'Dessert': '甜点',
  'Seasonal, whole or barely prepared.': '当季水果,整颗或简单处理。',
  'Small things between meals, from your cuisines.': '两餐之间的小食,来自你选的菜系。',
  'The everyday kind, not a restaurant pudding.': '家常做法,不是餐厅甜品。',
  'How often': '频率',
  'Rarely': '很少', 'Sometimes': '偶尔', 'Most days': '大部分日子',
  'At most two days a week.': '一周最多两天。',
  'Three or four days a week.': '一周三到四天。',
  'Most days, sometimes more than one.': '大部分日子,有时不止一样。',
  'You have low sugar on, so dessert appears at most twice a week whatever you choose here. Fruit fills the other days.':
    '你开启了少糖,所以无论这里怎么选,甜点一周最多出现两次,其余日子用水果代替。',
  // Flavour
  'How do you like it seasoned?': '口味偏好',
  'Seasoning': '调味强度', 'Light': '清淡', 'Balanced seasoning': '适中', 'Bold': '重口味',
  'Let the main ingredient taste of itself.': '突出食材本味。',
  'However the cuisine normally seasons it.': '按该菜系的常规调味。',
  'Fuller sauces, more aromatics, more chilli.': '酱汁更足,香料更多,辣度更高。',
  'Tastes you want more of': '想多一些的味型',
  'Sour 酸': '酸', 'Sweet 甜': '甜', 'Bitter 苦': '苦', 'Spicy 辣': '辣',
  'Savoury 鲜': '鲜', 'Numbing 麻': '麻', 'Aromatic 香': '香', 'Smoky': '烟熏',
  'Health needs': '健康需求', 'Low salt 少盐': '少盐', 'Low sugar 少糖': '少糖',
  'We will keep added salt and sugar down and say where a low-salt version of a sauce is needed.':
    '我们会控制额外添加的盐和糖,并在需要时注明使用低盐版本的酱料。',
  // Regions
  'Flavour and extras': '口味与加餐',
  // Generation progress
  'Reading your preferences': '正在读取你的偏好',
  'Checking what is already in your kitchen': '正在核对食材库',
  'Choosing dishes': '正在挑选菜品',
  'Checking nothing conflicts with what you avoid': '正在检查是否触及忌口',
  'Reworking the plan': '正在重新调整餐单',
  'Working out the shopping': '正在整理采购清单',
  'a dish contained': '有一道菜含有',
  '(second attempt)': '(第二次尝试)',
  'Your new plan is ready': '新餐单已生成',
  'The connection dropped while your plan was being built': '生成过程中连接中断',
  'Any regions in particular?': '有偏好的地区吗?',
  // Region names
  'Sichuan': '川菜', 'Cantonese': '粤菜', 'Hunan': '湘菜',
  'Jiangnan / Shanghai': '江浙沪', 'Northern': '北方', 'Dongbei': '东北',
  'Fujian': '闽菜', 'Yunnan': '云南', 'Xinjiang': '新疆', 'Hakka': '客家',
  'Kanto': '关东', 'Kansai': '关西', 'Kyushu': '九州', 'Hokkaido': '北海道',
  'Tohoku': '东北地方', 'Okinawa': '冲绳',
  'Seoul': '首尔', 'Jeolla': '全罗道', 'Gyeongsang': '庆尚道',
  'Gangwon': '江原道', 'Jeju': '济州岛',
  'Optional. Leave a cuisine blank and we will move around its regions week to week.':
    '可不填。留空的话,我们会每周在该菜系的不同地区之间轮换。',
  'Added': '手动添加', 'Add item': '添加一项', 'done': '项已完成', 'Add to list': '加入清单', 'Item': '物品',
  'Household': '家庭成员', 'Food Preferences': '饮食偏好', 'Cooking Preferences': '烹饪偏好',
  'Weekly budget': '每周预算', 'Preferred cuisines': '偏好菜系', 'Ingredients to avoid': '需要避开的食材',
  'Save Changes': '保存修改', 'Saving…': '正在保存…', 'Getting Started': '开始设置',
  'Your account': '你的账户', 'Edit Preferences': '编辑偏好', 'Loading your preferences…': '正在加载偏好…',
  'Could not load your preferences': '无法加载偏好', 'You have not set up your preferences yet': '你还没有设置偏好',
  'Tell us who you cook for and we can start planning meals around it.': '告诉我们为谁做饭，就能据此规划餐单。',
  'Upgrade your kitchen intelligence': '升级厨房智能',
  'Unlimited plans, AI Vision scanning and deeper pantry insights.': '无限餐单、AI 图像识别和更深入的食材洞察。',
  'Adults': '成人', 'Teenagers': '青少年', 'Children': '儿童', 'Toddlers': '幼儿',
  '18 and over': '18 岁及以上', '13 to 17': '13 至 17 岁', '5 to 12': '5 至 12 岁', '1 to 4': '1 至 4 岁',
  'Cooking for': '用餐人数', 'people': '人', 'person': '人', 'Adults / teens / children / toddlers': '成人 / 青少年 / 儿童 / 幼儿',
  'Planning': '餐单规划', 'Meals per week': '每周餐数', 'Weekly budget (£)': '每周预算（£）', 'Postcode': '邮编',
  'Cooking style': '烹饪方式', 'Cuisines': '菜系', 'None selected': '尚未选择', 'Avoiding': '需要避开',
  'Nothing excluded': '没有忌口', 'Priorities': '优先目标', 'Log Out': '退出登录',
  'Chinese': '中餐', 'British': '英餐', 'Indian': '印度菜', 'Pakistani': '巴基斯坦菜', 'Middle Eastern': '中东菜',
  'Japanese': '日餐', 'Korean': '韩餐', 'Thai': '泰餐', 'Vietnamese': '越南菜', 'Italian': '意大利菜',
  'Mexican': '墨西哥菜', 'Caribbean': '加勒比菜', 'West African': '西非菜', 'Mediterranean': '地中海菜',
  'Quick meals': '快速餐', 'Balanced': '均衡', 'Batch cooking': '批量烹饪', 'Take my time': '慢慢烹饪',
  'Budget': '预算', 'Health': '健康', 'Taste': '口味', 'Convenience': '方便', 'Less waste': '减少浪费',
  'Cultural authenticity': '地道文化风味',
  'Tell us about your household': '介绍一下你的家庭', 'Continue': '继续', 'Previous': '上一步',
  'Your eating habits': '你的饮食习惯', 'Choose cuisines you genuinely enjoy.': '选择你真正喜欢的菜系。',
  'What matters most?': '你最看重什么？', 'Finish Setup': '完成设置',
  'Step 1 of 3': '第 1 步，共 3 步', 'Step 2 of 3': '第 2 步，共 3 步', 'Step 3 of 3': '第 3 步，共 3 步',
  'Who are you cooking for?': '你为谁做饭？', 'This sets portion sizes and keeps meals suitable for everyone at the table.': '这会决定份量，并让餐食适合家里的每个人。',
  'Add at least one person.': '请至少添加一位家庭成员。', 'Which cuisines do you cook?': '你平时会做哪些菜系？',
  'Pick as many as you like. We use these to choose recipes, not to guess anything about you.': '可以多选，我们只用它来挑选食谱。',
  'How do you like to cook?': '你喜欢怎样做饭？', 'We will match recipes to the time you actually have.': '我们会根据你实际拥有的时间匹配食谱。',
  'Usual cooking time': '通常烹饪时间', 'Under 25 minutes': '25 分钟以内', '30 to 45 minutes': '30 至 45 分钟',
  'Cook once, eat several times': '一次烹饪，多次食用', 'Happy to spend an hour': '可以花一小时',
  'Anything to leave out?': '有什么需要避开？', 'Allergies, dislikes, or anything you do not eat. We only store the ingredients.': '包括过敏、不喜欢或不吃的食材；我们只保存食材信息。',
  'Quick presets': '快速选择', 'Common': '常见食材', 'Something else': '其他食材', 'Add': '添加',
  'Pick up to three. We use them to break ties when planning.': '最多选择三项，我们会据此平衡餐单。',
  'Budget and location': '预算和地区', 'Weekly budget (£, optional)': '每周预算（£，可选）', 'Postcode (optional)': '邮编（可选）',
  'Your setup': '你的设置', 'Cooking': '烹饪', 'Meals': '餐数', 'Nothing': '无', 'per week': '每周',
  'Finish setup': '完成设置', 'pork': '猪肉', 'beef': '牛肉', 'alcohol': '酒精', 'shellfish': '贝类',
  'peanuts': '花生', 'tree nuts': '坚果', 'gluten': '麸质', 'dairy': '乳制品', 'eggs': '鸡蛋', 'mushrooms': '蘑菇',
  'Halal': '清真', 'Kosher': '犹太洁食', 'Vegetarian': '素食', 'Vegan': '纯素',
  'Choose your plan': '选择方案', 'Unlock smarter food routines': '解锁更智能的饮食方式',
  'Static pricing cards for now. Payments are not connected in this phase.': '当前为价格方案展示，本阶段尚未接入支付。',
  'Best Value': '最超值', 'Starter': '入门版', 'Continue Free': '继续免费使用', 'Upgrade to Premium': '升级高级版',
  'Unlock Premium Plus': '解锁高级 Plus', 'forever': '永久免费', 'per month': '每月',
  'Forgot Your Password?': '忘记密码？', 'No worries. Enter your email address and we will send you a secure reset link.': '不用担心，输入邮箱后我们会发送安全的重置链接。',
  'Check your inbox': '请查看收件箱', 'We sent a mock reset link to your email address. No real email is sent yet.': '当前仅模拟发送重置链接，尚未发送真实邮件。',
  'Send Reset Link': '发送重置链接', 'Back To Login': '返回登录', 'Mock payment flow': '模拟支付流程',
  'Payment Coming Soon': '支付功能即将上线', 'This prototype shows where Stripe Checkout will be integrated.': '此原型展示未来接入 Stripe Checkout 的位置。',
  'Back to Pricing': '返回价格方案',
  'We will help you get back to planning healthier, lower-waste meals.': '我们会帮助你继续规划更健康、更少浪费的餐食。',
  'Reset your Mosaic Kitchen access': '重置 Mosaic Kitchen 登录',
  'Premium Plus': '高级 Plus', 'Try Mosaic Kitchen with starter meal planning.': '免费体验 Mosaic Kitchen 的基础餐单规划。',
  'Manual pantry tracking': '手动管理食材库', 'Unlimited planning for busy multicultural households.': '为忙碌的多元文化家庭提供无限餐单。',
  'Budget optimization': '预算优化', 'AI pantry suggestions': 'AI 食材建议', 'Expiry alert recipes': '临期食材食谱',
  'Advanced AI vision and household intelligence.': '更高级的 AI 图像识别和家庭饮食智能。',
  'Smart ingredient recognition': '智能食材识别', 'Household insights': '家庭饮食洞察', 'Priority support': '优先支持',
  'Edit detection mode is on. Tap ingredients to include or remove them.': '识别结果编辑已开启，点击食材即可添加或移除。',
  'Use spinach first - expires in 2 days.': '请优先使用菠菜，两天后到期。', 'This is a local mock file state.': '当前为本地模拟文件状态。',
  'Demo - Detected Ingredients': '演示：已识别食材',
  'History': '历史记录', 'Powered by Computer Vision': '计算机视觉驱动', 'AI Food Vision': 'AI 食物识别',
  'Ingredient recognition': '食材识别', 'Real-time detection': '实时检测', 'Scan Your Fridge': '扫描你的冰箱',
  'Take a photo of your fridge, pantry or groceries. AI will identify ingredients automatically.': '拍摄冰箱、食材柜或刚买的食物，AI 会自动识别食材。',
  'Take Photo': '拍照', 'or upload an image': '或上传图片', 'Upload Image': '上传图片', 'Fridge': '冰箱',
  'Groceries': '采购食材', 'Example Detection': '识别示例', 'Scan My Food': '扫描食物',
  'Detection Results': '识别结果', 'Detected Ingredients': '已识别食材', 'Done': '完成', 'Edit': '编辑',
  'Review before adding to pantry.': '加入食材库前请先检查。', 'Avg confidence': '平均置信度', 'Est. value': '预估价值',
  'selected': '已选择', 'AI Expiry Prediction': 'AI 保质期预测', 'Smart': '智能', 'Suggested expiry dates.': '建议的到期日期。',
  'Mosaic AI Suggestion': 'Mosaic AI 建议', 'Potential waste reduction': '预计减少浪费', 'Ready to add': '可以添加',
  'Done Editing': '完成编辑', 'Edit Detection': '编辑识别结果',
};

function initialLocale(): Locale {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === 'en' || saved === 'zh') return saved;
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

export function getStoredLocale(): Locale {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === 'en' || saved === 'zh') return saved;
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (english: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(initialLocale);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
  }, [locale]);

  const value = useMemo(
    () => ({ locale, setLocale, t: (english: string) => locale === 'zh' ? (zh[english] ?? english) : english }),
    [locale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('useLocale must be used inside LocaleProvider');
  return context;
}
