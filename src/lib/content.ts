import { Baby, House, School, Wheat, type LucideIcon } from "lucide-react";

export type AudienceId = "kindergarten" | "school" | "community" | "rural";

export type PracticeTask = {
  id: string;
  title: string;
  detail: string;
  duration: string;
};

export type AudiencePractice = {
  id: AudienceId;
  label: string;
  image: string;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  lead: string;
  focus: string;
  color: string;
  tasks: readonly PracticeTask[];
  observation: string;
  actionLabel: string;
};

export const audiencePractices: readonly AudiencePractice[] = [
  {
    id: "kindergarten",
    label: "幼儿园",
    image: "/幼儿园.png",
    icon: Baby,
    eyebrow: "从一粒米、一滴水开始",
    title: "小小节约守护员",
    lead: "把看得见的粮食和水，变成孩子愿意亲手完成的小习惯。",
    focus: "认识来之不易",
    color: "#d3973e",
    tasks: [
      { id: "kindergarten-rice", title: "一粒米的旅行", detail: "看看一碗饭从田地到餐桌经过了哪些地方。", duration: "5 分钟" },
      { id: "kindergarten-meal", title: "我的小饭碗", detail: "先取自己能吃完的一小份，不够再添。", duration: "一餐" },
      { id: "kindergarten-water", title: "关紧小水龙头", detail: "洗手打湿后先关水，发现滴水马上告诉老师。", duration: "一天" },
    ],
    observation: "把今天做到的一件小事告诉老师或家长。",
    actionLabel: "领取小小守护任务",
  },
  {
    id: "school",
    label: "中小学",
    image: "/中小学.png",
    icon: School,
    eyebrow: "在校园完成节约挑战",
    title: "校园资源侦探",
    lead: "从教室、食堂和水池出发，找到每天都能减少的一点浪费。",
    focus: "发现身边的资源流失",
    color: "#3f9b75",
    tasks: [
      { id: "school-light", title: "课后关灯检查", detail: "离开教室前，检查灯、风扇和投影是否关闭。", duration: "一周" },
      { id: "school-plate", title: "光盘打卡", detail: "按需取餐，用自己的饭量完成一餐不浪费。", duration: "三餐" },
      { id: "school-recycle", title: "旧物新生角", detail: "整理可继续使用的文具、书本或材料。", duration: "15 分钟" },
    ],
    observation: "记录一个你发现的浪费点，并写下可行的改变办法。",
    actionLabel: "开始校园挑战",
  },
  {
    id: "community",
    label: "社区",
    image: "/社区.png",
    icon: House,
    eyebrow: "把节约带回每个家庭",
    title: "家门口的节约行动",
    lead: "让一餐饭、一盏灯、一件旧物，成为邻里之间可以一起完成的事。",
    focus: "家庭与邻里的共同参与",
    color: "#c2854e",
    tasks: [
      { id: "community-fridge", title: "冰箱清单", detail: "先吃快到期食材，购买前看看家里已有的食物。", duration: "一周" },
      { id: "community-repair", title: "旧物修一修", detail: "为一件旧物找到修补、转赠或再利用的办法。", duration: "30 分钟" },
      { id: "community-power", title: "晚间节能约定", detail: "和家人约定一个随手关灯、拔插头的时刻。", duration: "每天" },
    ],
    observation: "邀请一位家人或邻居，和你一起完成一项行动。",
    actionLabel: "发起家庭行动",
  },
  {
    id: "rural",
    label: "乡村",
    image: "/乡村.png",
    icon: Wheat,
    eyebrow: "让好收成少一点损耗",
    title: "丰收守护行动",
    lead: "从田间用水、收获储存到餐桌珍惜，读懂每一份收成都值得被善待。",
    focus: "珍惜收成与节约用水",
    color: "#ad8b35",
    tasks: [
      { id: "rural-grain", title: "收成观察卡", detail: "了解一种农作物从播种到收获需要哪些劳动。", duration: "20 分钟" },
      { id: "rural-water", title: "田间节水提醒", detail: "观察灌溉时是否有空流、渗漏或可改进的地方。", duration: "一次走访" },
      { id: "rural-storage", title: "粮食好好放", detail: "学习干燥、通风、防潮等简单的粮食储存常识。", duration: "10 分钟" },
    ],
    observation: "向身边的劳动者问一句：怎样能让粮食少一点损耗？",
    actionLabel: "守护一份好收成",
  },
] as const;

export function getAudiencePractice(id?: string) {
  return audiencePractices.find((practice) => practice.id === id) ?? audiencePractices[0];
}
