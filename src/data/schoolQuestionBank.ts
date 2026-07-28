export type SchoolGrade = "primary" | "junior" | "senior";

export type SchoolQuestion = {
  id: string;
  question: string;
  choices: string[];
  answer: number;
  explanation: string;
  action: string;
};

type Scenario = {
  title: string;
  situation: string;
  correct: string;
  distractors: [string, string];
  explanation: string;
  action: string;
};

const variants = [
  "小组发现连续三天都有类似情况",
  "老师要求大家先说证据，再说结论",
  "班里同学对原因有两种不同看法",
  "你们只有十分钟，需要先决定最关键的一步",
  "行动结束后还要向全班说明为什么这样做",
];

const scenarios: Record<SchoolGrade, Scenario[]> = {
  primary: [
    { title: "取餐判断", situation: "小明平时吃半碗饭，今天却被盛了满满一碗", correct: "先吃自己能吃完的量，不够再添", distractors: ["为了不浪费硬把一大碗全吃完", "不问原因，直接把饭倒掉"], explanation: "先按自己的食量取饭，吃不够再添，既不浪费也不会勉强自己。", action: "今天先少取一点，不够再添。" },
    { title: "剩饭观察", situation: "同桌剩下了很多饭，但他说自己已经吃不下了", correct: "先问问是取多了、味道不喜欢，还是时间不够", distractors: ["马上说他是不爱惜粮食", "把剩饭藏起来，假装没有发生"], explanation: "先知道为什么剩下，才能想出合适的办法，不能只凭一眼就批评别人。", action: "用友好的话问清一个原因。" },
    { title: "食物来处", situation: "老师问一碗米饭为什么值得珍惜", correct: "想到种植、收割、运输和做饭的人都付出了劳动", distractors: ["认为米饭只要花钱买就行了", "认为只有做饭的人在劳动"], explanation: "一碗饭来到餐桌要经过很多人的劳动，所以应该珍惜。", action: "说出一位为这碗饭付出劳动的人。" },
    { title: "友善提醒", situation: "同学想把还没吃完的饭倒掉", correct: "先问他是否还能吃完，陪他想一个办法", distractors: ["当着全班同学的面大声责备他", "趁他不注意把饭拿走"], explanation: "友善提醒更容易让同学愿意改变，节约要靠大家一起做到。", action: "练习一句不伤人的节约提醒。" },
    { title: "安全保存", situation: "午餐剩下一小块食物，老师说可以安全保存", correct: "在老师指导下把它装好，按要求保存", distractors: ["把食物放在桌上，什么时候想吃再说", "不管是否变质都一定要吃掉"], explanation: "珍惜食物要和食品安全一起做到，安全保存才是真正的节约。", action: "记住先问清楚能不能保存。" },
    { title: "合理点餐", situation: "小组要为四个人准备点心，不知道该准备多少", correct: "先数人数，再估计每个人能吃多少", distractors: ["准备越多越显得大方", "看到喜欢的食物就全部买下来"], explanation: "先数人数、估计食量，才不容易准备过多。", action: "点餐前先数人数和份数。" },
    { title: "安全判断", situation: "一份食物闻起来不对，但有人说浪费可惜", correct: "先请老师或家长判断是否安全", distractors: ["为了节约继续吃下去", "把它和其他食物混在一起"], explanation: "不能为了节约忽略安全，遇到不确定的食物要请大人判断。", action: "遇到不确定的食物先询问大人。" },
    { title: "行动口号", situation: "班级想做一张节粮海报", correct: "写清楚大家今天马上能做的一件事", distractors: ["只写很大的口号，不说怎么做", "把海报画得很满，让人找不到重点"], explanation: "好的海报不仅要好看，还要让大家看懂并愿意行动。", action: "写一句具体的节约做法。" },
    { title: "小组分工", situation: "四位同学一起完成节粮任务", correct: "有人观察、有人记录、有人汇报，每个人有清楚的事", distractors: ["让一个同学做完所有事情", "大家都做同一件事，没人负责记录"], explanation: "清楚分工能让小组合作更顺利，也能留下真实记录。", action: "给每位组员安排一个小任务。" },
    { title: "行动评价", situation: "班级做了一周节粮行动，大家想知道有没有效果", correct: "比较行动前后的剩饭情况和记录", distractors: ["只看海报漂不漂亮", "只听谁的口号喊得最响"], explanation: "要看真实变化，不能只看声音或外表。", action: "找一条行动前后的真实变化。" },
  ],
  junior: [
    { title: "先找证据", situation: "班级一周内多次出现剩饭，但没人知道主要原因", correct: "先记录时间、人数、分量和剩饭原因，再讨论", distractors: ["直接认定是同学没有节约意识", "先做宣传海报，之后再想问题是什么"], explanation: "先收集基本事实，才能避免凭感觉下结论，让措施真正针对问题。", action: "设计一张一周观察记录表。" },
    { title: "原因区分", situation: "同样是剩饭，有人是取多了，有人是不喜欢口味", correct: "把不同原因分类记录，分别寻找办法", distractors: ["把所有剩饭都归为不自律", "只统计剩饭总量，不记录原因"], explanation: "不同原因需要不同措施，混在一起会让方案失去针对性。", action: "为剩饭设计至少三类原因。" },
    { title: "资源价值", situation: "小组想说明一碗饭为什么不应被轻易浪费", correct: "从生产、运输、加工和烹饪等环节分析劳动与资源", distractors: ["只用饭菜价格判断价值", "只讲道德要求，不解释食物经历的过程"], explanation: "食物价值不只体现在价格，还包括资源、劳动和环境成本。", action: "画出一份食物的流程链。" },
    { title: "提醒方式", situation: "同学听到节粮提醒后觉得被责备，不愿参加活动", correct: "用事实说明问题，和同学一起讨论可行办法", distractors: ["用更严厉的话让他服从", "把他的名字写在公示栏里"], explanation: "尊重和事实更有利于长期改变，羞辱可能造成抵触。", action: "把一句责备改成一句合作邀请。" },
    { title: "食品安全", situation: "小组准备把剩余食物带回家，但不知道保存条件", correct: "先确认温度、时间和卫生条件，再决定是否处理", distractors: ["只要没有异味就一定可以吃", "为了减少浪费，任何剩食都带走"], explanation: "节约方案必须以食品安全为前提，不能用猜测替代判断。", action: "列出带走剩食前要确认的条件。" },
    { title: "估算分量", situation: "活动点心常常剩下，组员提出以后按最大食量准备", correct: "用人数、过去记录和实际食量估算，并预留调整办法", distractors: ["永远按最大食量准备", "只凭一次活动的印象决定"], explanation: "合理估算要使用已有记录，并允许根据实际情况调整。", action: "用过去记录估算下一次分量。" },
    { title: "分类规则", situation: "小组要统计剩饭，成员对‘没吃完’的定义不一致", correct: "先约定统一、可观察的分类标准", distractors: ["每个人按自己的感觉记录", "为了结果好看，删掉难分类的记录"], explanation: "统一标准能让记录更可靠，也方便小组比较结果。", action: "写出一条大家都能执行的记录标准。" },
    { title: "宣传设计", situation: "班级已有很多节粮口号，但实际剩饭没有变化", correct: "先找出行为环节的障碍，再设计对应措施", distractors: ["继续增加口号数量", "认为同学不改变就是态度问题"], explanation: "宣传不是终点，要找到取餐、时间或口味等具体障碍。", action: "把一个口号改成一个可执行动作。" },
    { title: "小组合作", situation: "小组调查结果不一致，大家争论谁的记录才是真的", correct: "核对记录标准、时间和证据，再共同修正", distractors: ["由组长直接宣布一个结果", "选择看起来最漂亮的一组数据"], explanation: "先核对方法和证据，比争论个人对错更可靠。", action: "复核一条记录的时间和依据。" },
    { title: "效果评价", situation: "宣传后一周剩饭少了，但这一周参加午餐的人也少了", correct: "说明可能有其他因素影响，继续记录后再判断", distractors: ["马上宣布宣传百分之百有效", "直接认定活动完全没有用"], explanation: "变化不一定只由一个措施造成，需要考虑人数等其他因素。", action: "记录一个可能影响结果的因素。" },
  ],
  senior: [
    { title: "问题界定", situation: "学校想降低剩饭率，但目前只有‘浪费严重’这一句描述", correct: "明确对象、时间、指标和基线，再设计干预", distractors: ["先发布一套方案，再补充数据", "直接用一次观察代表整个学期"], explanation: "问题必须被定义和测量，方案才能检验是否有效。", action: "为问题写出对象、时间和一个指标。" },
    { title: "变量拆解", situation: "剩饭增加可能与分量、口味、就餐时间和排队有关", correct: "拆分变量并设计能区分原因的观察记录", distractors: ["只选择自己最相信的一个原因", "把所有因素混成一个‘态度问题’"], explanation: "将变量拆开，才有可能判断哪个因素与结果相关。", action: "为一个变量设计可观察记录。" },
    { title: "成本分析", situation: "两套方案都能减少剩饭，一套成本低但效果不稳定", correct: "同时比较效果、资源成本、执行难度和持续性", distractors: ["只选择最便宜的方案", "只选择第一次效果最大的方案"], explanation: "公共行动要比较短期效果和长期执行成本，不能只看单一指标。", action: "给方案列出效果和成本两类指标。" },
    { title: "行为干预", situation: "强制提醒短期有效，但学生开始抵触活动", correct: "改为尊重参与者的提示，并优化取餐等实际环节", distractors: ["继续加大公开批评力度", "为了数据好看隐藏抵触反馈"], explanation: "可持续方案要兼顾效果、尊重和执行成本，不能只追求短期数字。", action: "提出一条减少抵触的设计改动。" },
    { title: "安全边界", situation: "团队希望把所有剩食都打包，以证明活动节约", correct: "把食品安全条件写成方案的前置约束", distractors: ["先打包，安全问题以后再处理", "用个人经验代替明确的安全判断"], explanation: "节约不能突破食品安全边界，方案必须先规定什么可以处理。", action: "在方案中写出一条安全边界。" },
    { title: "样本判断", situation: "小组只观察了一个班，就想代表全校得出结论", correct: "说明样本范围和局限，扩大观察后再推广结论", distractors: ["把一个班的数据直接当作全校数据", "为了结论完整而省略样本限制"], explanation: "样本范围决定结论能推广到哪里，不能把局部观察说成全校事实。", action: "在汇报中写明观察范围。" },
    { title: "指标设计", situation: "方案把‘参与人数’当作唯一成功标准", correct: "同时设置过程指标和结果指标，并说明数据来源", distractors: ["只要参与人数多就算成功", "用一句口号代替效果指标"], explanation: "参与人数只能说明覆盖范围，还需要结果和过程指标判断实际效果。", action: "为方案补充一个结果指标。" },
    { title: "方案闭环", situation: "提案写了‘减少浪费’，却没有负责人、时间和复盘方式", correct: "补齐措施、负责人、时间节点、指标和复盘方式", distractors: ["用更有气势的标题掩盖空缺", "把全部责任交给食堂"], explanation: "可执行提案需要完整闭环，责任和检验方式不能缺席。", action: "把提案补成一张责任流程表。" },
    { title: "证据复核", situation: "两组数据结论相反，且记录方式不完全相同", correct: "先检查定义、记录方式和时间，再决定能否比较", distractors: ["选择支持自己观点的数据", "直接取两组平均数宣布结论"], explanation: "数据比较的前提是定义和记录方式可比，不能跳过证据质量检查。", action: "列出两组数据的一个差异来源。" },
    { title: "因果判断", situation: "海报发布后剩饭下降，团队想宣称海报造成了全部变化", correct: "保留谨慎表述，继续对照观察并记录其他变化", distractors: ["把相关变化直接说成唯一因果", "删除没有改善的日期"], explanation: "前后变化不等于已经证明因果，需要对照和持续记录来提高可信度。", action: "为下一轮行动设计一个对照记录。" },
  ],
};

const gradeNames: Record<SchoolGrade, string> = { primary: "小学生", junior: "初中生", senior: "高中生" };

export const schoolQuestionBank: Record<SchoolGrade, SchoolQuestion[]> = { primary: [], junior: [], senior: [] };

for (const grade of Object.keys(schoolQuestionBank) as SchoolGrade[]) {
  schoolQuestionBank[grade] = scenarios[grade].flatMap((scenario, scenarioIndex) => variants.map((variant, variantIndex) => {
    const answer = (scenarioIndex + variantIndex) % 3;
    const choices = [scenario.correct, ...scenario.distractors].map((choice, index) => {
      const targetIndex = (index + answer) % 3;
      return { choice, targetIndex };
    }).sort((left, right) => left.targetIndex - right.targetIndex).map((item) => item.choice);
    return {
      id: `${grade}-${scenarioIndex + 1}-${variantIndex + 1}`,
      question: `${scenario.title}：${scenario.situation}。${variant}，下面哪种处理最有依据？`,
      choices,
      answer,
      explanation: `${scenario.explanation}判断依据是先看事实和条件，再选择能在课堂中执行的办法。`,
      action: `小组行动：${scenario.action}`,
    };
  }));
}

export function getRandomSchoolQuestion(grade: SchoolGrade, previousId?: string) {
  const questions = schoolQuestionBank[grade];
  const available = previousId ? questions.filter((question) => question.id !== previousId) : questions;
  return available[Math.floor(Math.random() * available.length)] ?? questions[0];
}

export function getSchoolGradeLabel(grade: SchoolGrade) {
  return gradeNames[grade];
}
