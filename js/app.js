(function(){
  'use strict';
  const D=window.SquadData,E=window.SquadEngine;
  const root=document.getElementById('game-root');
  const canvas=document.getElementById('game-canvas');
  function fitCanvas(){if(!canvas?.style)return;canvas.style.setProperty('--game-scale',String(Math.min(window.innerWidth/1440,window.innerHeight/810)));}
  window.addEventListener?.('resize',fitCanvas);
  const num=(n,d=0)=>Number(n).toLocaleString('zh-CN',{maximumFractionDigits:d});
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const openingCopy=[
    '主公，欢迎执掌朔风军。我是军务参佐岚。这是一份离线演示，以一款对战游戏为假想场景，探讨如何避免游戏中的货币与物价失衡，并展示策划如何运用政策工具，维持经济系统的稳定。',
    '设计者希望构建一套更贴近真实经济运行规律的系统，让游戏在前期、中期和后期都能保持相对稳定的货币购买力与经济环境，从而改善玩家的长期体验，兼顾成长节奏与竞争平衡。具体而言，希望实现以下目标：',
    '1. 新玩家能够顺利起步。即使在游戏运营后期加入，也不必先投入大量时间追赶老玩家，便能找到适合自己的成长路径，获得独特且有价值的游戏体验。',
    '2. 回归玩家能够较快重新融入。对于中途离开、再次回归的玩家，尽量维持其积累货币的购买力，减少经济失衡造成的额外资产贬值，让他们能够利用已有积累，较快重新融入游戏。',
    '3. 长期玩家能够以可持续的节奏游玩。无需每天投入大量时间，也能通过轻度参与和持续、可控的付费，维持合理的成长节奏，获得稳定的长期体验。'
  ];
  function openingContent(){return `<div class="opening-text" aria-live="polite">${openingCopy.slice(0,2).map(text=>`<p>${esc(text)}</p>`).join('')}<ol>${openingCopy.slice(2).map(text=>{const goal=text.replace(/^\d+\. /,''),end=goal.indexOf('。')+1;return `<li><strong>${esc(goal.slice(0,end))}</strong>${esc(goal.slice(end))}</li>`;}).join('')}</ol></div>`;}
  const summaryParagraphs=[
  "这套经济设计围绕玩法、资产和货币建立持续循环，让玩家的游玩收益、成长支出与长期积累保持相对稳定的关系。玩家能够预估获得一项资产需要多少时间、持有它需要多少成本，以及过去积累的资源还能发挥什么作用，从而降低新玩家进入、老玩家回归和长期参与的成本。",
  "玩家通过对战、任务等核心玩法获得金币，再用金币购买和使用角色、装备等核心资产。资产帮助玩家参与玩法、获得收益，同时也产生工资、维护费等持续支出。这样，玩法负责提供收入，资产的持有和使用形成日常消耗，使货币投放与回收连接在玩家的正常游玩过程中。",
  "核心资产需要持续成长，也需要合理退出。例如，角色可以经历培养、成熟、衰退和退役，装备可以随着使用产生损耗。这些机制使玩家持续产生培养、替换和补充资产的需求，避免资产无限积累。资产因使用和生命周期发生的正常价值变化，与经济失衡造成的额外贬值，需要分开管理。",
  "玩家之间的交易让已有资产重新分配，满足不同玩家的成长和阵容调整需求。交易本金在玩家之间转移，交易税则回收部分金币，并通过改变交易成本调节流通活跃度。官方还可以通过拍卖等方式投放新资产，让玩家以金币竞争获取，同时回收成交款。前者促进已有资产流通，后者同时影响新增资产供给与金币消耗。",
  "充值货币通过付费发行，并通过玩家间兑换与金币经济连接。付费玩家可以出售充值货币，获得其他玩家积累的金币；非付费玩家也可以用游玩所得换取充值货币，参与相应消费。兑换使用的是玩家已经持有的货币，使充值购买力通过转移进入游戏，避免兑换环节直接增发金币。兑换价格仍会随着需求变化，例如需要大量金币的活动结束后，金币需求回落，两种货币的相对价值也可能改变。",
  "充值货币的持续需求来自具体的游戏内容。一部分用于缩短培养时间、提高使用便利和丰富游玩体验，让玩家根据时间与资源选择成长方式；另一部分用于招募或生成新资产，让玩家主动参与资产供给。前者主要影响成长效率，后者主要影响资产数量。新增资产的数量、品质与退出节奏需要相互衔接，让持续的养成和补充需求推动消费，同时维持核心资产的长期价值。"
];
  const behaviorRows=[
  [
    "玩家充值",
    "不变",
    "增加",
    "不直接变化"
  ],
  [
    "联赛发奖",
    "增加",
    "不变",
    "提供使用需求"
  ],
  [
    "支付军饷",
    "减少",
    "不变",
    "形成持有成本"
  ],
  [
    "玩家交易 · 本金",
    "不变",
    "不变",
    "数量不变，所有权转移"
  ],
  [
    "玩家交易 · 税费",
    "减少",
    "不变",
    "改变交易成本"
  ],
  [
    "官方拍卖成交",
    "减少",
    "不变",
    "新增核心资产"
  ],
  [
    "玩家间货币互换",
    "不变",
    "不变",
    "不直接变化"
  ],
  [
    "使用培养服务",
    "不变",
    "减少",
    "数量不变，增加培养积累"
  ],
  [
    "使用招募服务",
    "不变",
    "减少",
    "新增核心资产"
  ],
  [
    "资产退役或退出",
    "不变",
    "不变",
    "减少在用资产"
  ]
];
  const documentIntro={overview:'从全体玩家的总量看，区分货币新增、系统回收与玩家间转移，再观察核心资产的新增、成长和退出。',simulation:'主公，接下来用40名领主、10季120天检验这套循环。左侧设置本轮政策，运行后查看总账、将市、领主明细，并保留结果进行两轮对照。对照结果可以看出，不同的政策设定会如何影响经济运行，策划也可以据此调整政策，维持游戏内的经济平衡。模拟账本独立于前面的主线账户。',summary:'主公，以上是整套经济设计的总结。可返回经济实验调整政策，也可回看对话、查阅账簿。'};
  const lines=[
    ['welcome',0,'home',openingCopy.join('\n\n')],
    ['start',0,'home','主公，这里是游戏主页。你可以在军府中管理队伍与资产。请先进入高亮的军府，查验麾下行伍。','open-army'],
    ['roster-intro',1,'squad','在这份演示中，武将是玩家的核心资产。你目前拥有五名武将，其中三名上阵、两名候补。围绕武将的招募、培养与维护，将构成玩家最主要的资源投入。如何选择和使用这些资产，是军团经营的核心。'],
    ['inspect-roster',1,'squad','每位武将都有不同的能力与特性。这份演示更关注的是，核心资产在持续产出的同时，也需要合理的退出机制，以维持资产存量的相对平衡。在这里，年龄随游戏进程统一增长，健康度则随对战次数增加而逐步消耗，两者共同影响武将的退役时机。这意味着，武将既有使用期限，也受到使用次数的约束，从而形成持续的培养、使用与更新需求。现在可以自由点击五名武将，比较他们的能力与持有成本，查看完毕后再继续。'],
    ['wage-rule',1,'squad','军饷是持有武将的持续成本，按当前评分分档，每人每天20至50铜钱。你的五名武将每日合计150铜钱，候补与受伤者照常计薪。玩家需要在阵容储备与日常负担之间做出取舍，而军饷也为经济系统提供了一条持续回收铜钱的渠道。'],
    ['go-league',2,'home','回到主城，接下来进入游戏的核心玩法——诸侯联赛。我们将通过一场对战，观察武将的使用、铜钱奖励与军饷支出如何连接起来，构成游戏经济循环的一部分。本季末轮尚未结算，现在进入联赛，处理最后一场战报。','open-league'],
    ['league-intro',2,'league','本作品通过预设战报展示经济结算：比赛奖励新增铜钱，军饷支出回收铜钱。重点是核对这两笔资金如何进入账本，并区分玩家的收支变化与整个经济系统的货币净投放。'],
    ['settle',2,'league','末轮朔风军3∶1得胜，奖励200铜钱，同时支付军饷150。请结算本轮：主城上的战绩也会随之更新，而非一张写死的赛季海报。','settle'],
    ['settled',2,'league','本次结算发放200铜钱奖励，并扣除150铜钱军饷，你的余额从1,000增加到1,050。对整个经济系统而言，奖励新增了200铜钱，军饷回收了150铜钱，两者相抵后，流通中的铜钱净增加50。核心玩法负责货币的增发，核心资产的使用负责货币的收回，形成动态的平衡。'],
    ['go-market',3,'home','接下来到将市补充阵容。武将交易与官府稀有竞拍共用这个入口，资金去向却不同。我们先完成一笔玩家之间的交易。','open-market'],
    ['market-intro',3,'market','将市让铜钱与武将在领主之间转移：买方获得武将，卖方获得扣税后的铜钱。交易税既回收部分货币，也调节交易意愿——休赛期下调税率，鼓励阵容调整；赛季中期上调税率，抑制频繁交易。本次竞拍按20%的卖方税率结算。'],
    ['trade',3,'market','许衡从100铜钱起拍。请与其他领主轮流加价，完成本次竞拍；最终成交后再支付价款。','trade'],
    ['traded',3,'market','你以300铜钱竞得许衡，剩750铜钱。武将转入你的军团，240铜钱转入卖方账户，60铜钱作为交易税退出流通。税率通过改变交易成本影响交易意愿，实际调控效果还需结合成交活跃度判断。'],
    ['go-exchange',4,'home','钱玉互兑连接两类玩家：愿意付费获取玉璧的人，以及愿意以游戏积累的铜钱购买玉璧的人。你初始持有100玉璧。先进入互兑行，将玉璧卖给市场买单，换取已有铜钱。','open-exchange'],
    ['exchange-intro',4,'exchange','刚才，我们了解了铜钱的主要作用：用于武将交易、军饷与竞拍等核心资产相关支出。接下来介绍玉璧，也就是通过充值获得的付费货币。\n\n如果玉璧可以直接向系统兑换铜钱，充值就可能带来持续的铜钱增发，增加通胀压力。因此，我们将钱玉互兑设计为玩家之间的交易：充值玩家用玉璧换取其他玩家已有的铜钱，其他玩家则用积累的铜钱获取玉璧。\n\n兑换改变的是货币的持有人，铜钱总量不会因此增加，从而减轻充值对局内经济的直接冲击。'],
    ['exchange',4,'exchange','当前市场买单报价为每玉璧20铜钱。请卖出100玉璧，获得2,000铜钱。','exchange'],
    ['exchanged',4,'exchange','你现有2,750铜钱、0玉璧。刚刚获得的2,000铜钱来自其他玩家，兑换只改变货币的持有人，没有新增铜钱或玉璧。接下来，用其中1,000铜钱参与官府竞拍，观察成交款的另一种去向。'],
    ['go-auction',5,'home','先回将市，进入官府竞拍。与刚才的玩家交易不同，这里的武将由系统投放，成交铜钱全额退出流通。你将与其他领主交替加价，用刚换得的铜钱竞拍武将，了解官方资产供给与铜钱回收如何同时发生。','open-market'],
    ['auction',5,'auction','唐晟从200铜钱起拍。请与其他领主逐轮加价，竞得这名由官府投放的新武将。','auction'],
    ['auctioned',5,'auction','你以1,000铜钱竞得唐晟，剩1,750铜钱。唐晟作为新武将进入你的军团，成交款全额退出流通。与玩家二手交易主要转移已有资产不同，官府拍卖同时增加武将供给并回收铜钱。'],
    ['go-exchange-back',6,'home','唐晟已经加入军团，本期官府拍卖也已结束。接下来回互兑行，用铜钱买回练兵与寻访所需的玉璧，观察拍卖期前后兑换价格的变化。','open-exchange'],
    ['exchange-rise',6,'exchange','在本例中，官府拍卖结束后，玩家为竞价而持有铜钱的需求回落，铜钱相对玉璧的兑换价值下降。报价从每玉璧20铜钱变为25铜钱。同样1,000铜钱，原来能买50玉璧，现在只能买40玉璧。玩家间互兑不增发铜钱，但兑换价格仍会随需求变化而波动。'],
    ['exchange-back',6,'exchange','当前报价为每玉璧25铜钱。请支付1,000铜钱，买回40玉璧。','exchange-back'],
    ['exchanged-back',6,'exchange','你现有750铜钱、40玉璧。刚换得的2,000铜钱中，1,000用于购买唐晟，另1,000用于按新报价买回玉璧。购买武将的支出与汇率变化的影响，需要分开判断；两次互兑本身都没有新增货币。接下来将30玉璧用于练兵和寻访。'],
    ['go-training',7,'home','接下来回军府练兵与招募。你已用铜钱获得唐晟，并按上涨后的报价买回40玉璧。现在使用玉璧，观察培养和寻访如何形成付费货币的消耗。','open-army'],
    ['training-intro',7,'training','在武将交易之外，玉璧还可以用于提升养成效率。本例为玉璧设计的第一个用途是练兵：玩家可以投入玉璧，缩短武将形成战斗力所需的时间，也可以通过正常培养逐步成长。练兵主要改变资产形成的速度，让玩家根据自己的时间与资源选择成长节奏，并为玉璧建立持续的支出需求。'],
    ['train',7,'training','请花费10玉璧，为林川使用一次练兵军资。','train'],
    ['scout',7,'recruitment','本例为玉璧设计的第二个用途是寻访，主要影响武将的新增数量。玩家可以消耗玉璧，让部分核心资产通过主动招募产生，进入培养与交易循环。寻访既满足补充阵容的需求，也促进玉璧消耗；招募数量、武将品质与资产退出节奏需要一并控制，避免武将供给过快增长。现在花费20玉璧，寻访一名后备武将。','scout'],
    ['economic-overview',8,'overview',documentIntro.overview+'\n\n'+behaviorRows.map(row=>row.join('｜')).join('\n')],
    ['economic-simulation',8,'simulation',documentIntro.simulation],
    ['economic-summary',8,'summary',summaryParagraphs.join('\n\n')]
  ].map(([id,chapter,scene,text,action])=>({id,chapter,scene,text,action}));

  function restoreCheckpoint(id){if(['design-intent','new-player-goal','returning-player-goal','long-term-player-goal'].includes(id))return 'welcome';if(['inspect-young','inspect-old'].includes(id))return 'inspect-roster';if(['go-pvp','pvp','pvp-done'].includes(id))return 'go-market';if(id==='recharge')return 'exchange';if(['age-intro','age','retired','supply-intro','box','trained','ledger','ledger-meaning','inflation-intro','inflation-explain','inflation-tradeoff','policy-intro','policy-detail','policy','policy-issued','results','results-cost','finish','report'].includes(id))return 'economic-overview';return id;}
  let state=E.initial(),cursor=0,modal=null,toast='',homePeek=false;
  try{const stored=JSON.parse(localStorage.getItem(D.saveKey)||'null');if(stored)stored.game=E.migrateSave(stored.game);if(stored&&E.validate(stored.game)&&Number.isInteger(stored.cursor)&&stored.cursor>=0){const checkpointIndex=lines.findIndex(line=>line.id===restoreCheckpoint(stored.game.checkpoint)),restoredCursor=checkpointIndex>=0?checkpointIndex:stored.cursor;if(restoredCursor<lines.length){state=stored.game;cursor=restoredCursor;const auctionIndex=lines.findIndex(line=>line.id==='go-auction');if(cursor>lines.findIndex(line=>line.id==='auctioned')&&!state.completed.includes('auction'))cursor=auctionIndex;if(cursor>lines.findIndex(line=>line.id==='exchanged-back')&&!state.completed.includes('exchange-back'))cursor=lines.findIndex(line=>line.id==='go-exchange-back');}}}catch(e){}
  let previousTotals=E.totals(state),lastScene=null;
  const node=()=>lines[cursor];
  const face=(index,extra='')=>`<div class="portrait ${extra}" style="--portrait-x:${(index%3)*50}%;--portrait-y:${index>=3?100:0}%" role="img" aria-label="半写实武将立绘"></div>`;
  const small=(label,value)=>`<div class="stat-line"><span>${label}</span><b>${value}</b></div>`;
  function save(){state.checkpoint=node().id;try{localStorage.setItem(D.saveKey,JSON.stringify({game:state,cursor}));}catch(e){}}
  function primary(action,label){const active=node().action===action;const done=state.completed.includes(action);return `<button type="button" class="button ${active?'primary guided-target':''}" data-act="${action}" ${(!active||done)?'disabled':''}>${done?'已完成':label}${active&&!done?'<span aria-hidden="true"> ↗</span>':''}</button>`;}
  function stageLabel(p){return p.retired?'已退役':p.age<22?'青年培养':p.age<30?'巅峰时期':'衰退时期';}
  function isInjured(p){return p.injured??D.members.find(member=>member.id===p.id)?.injured??false;}
  function healthScore(p){return Math.max(0,Math.min(100,Number.isFinite(p.health)?p.health:isInjured(p)?45:100));}
  function playerStats(p){return `${small('当前年龄',p.age+'岁')}${small('当前评分',p.ability)}${small('潜力上限',p.potential)}${small('当前日军饷',E.wage(p)+' 铜钱')}${small('健康度',`<span class="health-tag ${healthScore(p)<70?'health-low':''}">${healthScore(p)}%</span>`)}${small('健康状态',p.retired?'已退役':isInjured(p)?'受伤':'可出战')}`;}
  function canInspectRoster(){return node().id==='inspect-roster'&&!homePeek;}
  function playerCard(p,options={}){
    const roster=Boolean(options.roster),browse=roster&&canInspectRoster();
    const label=roster?`${p.name}，评分${p.ability}，${p.age}岁`:`${p.name}，${p.grade}级，${p.age}岁，能力${p.ability}`;
    return `<button type="button" class="player-card ${roster?'roster-player-card':'grade-'+p.grade.toLowerCase()} ${browse?'is-inspectable':''} ${p.retired?'retired':''} ${state.selected===p.id?'selected':''}" data-player="${p.id}" ${browse?'':'disabled'} aria-label="${label}" ${roster?`aria-pressed="${state.selected===p.id}"`:''}>${face(p.portrait)}<div class="player-shade"></div>${roster?'<span class="rating-label">评分</span>':`<span class="rarity">${p.grade}</span>`}<span class="player-number">${p.ability}</span><div class="player-caption"><span>${p.age}岁</span><strong>${p.name}</strong>${roster?'':`<div class="player-sub">${p.retired?'已退役':stageLabel(p)}<span>潜力 ${p.potential}</span></div>`}</div>${options.lineup?'<span class="lineup-ribbon">首发</span>':''}</button>`;
  }
  function reserveCard(member){const browse=canInspectRoster();return `<button type="button" class="bench-person ${isInjured(member)?'is-injured':''} ${state.selected===member.id?'selected':''} ${browse?'is-inspectable':''}" data-player="${member.id}" ${browse?'':'disabled'} aria-pressed="${state.selected===member.id}" aria-label="${member.name}，候补，评分${member.ability}，${member.age}岁">${face(member.portrait)}<span>${member.name}<small>评分 ${member.ability} · ${member.age}岁</small></span>${isInjured(member)?'<span class="injury-badge">＋ 受伤</span>':''}</button>`;}
  function heading(kicker,title,subtitle=''){kicker=kicker.includes(' / ')?kicker.split(' / ').slice(1).join(' / '):kicker;return `<div class="view-heading"><div><p class="eyebrow">${kicker}</p><h1>${title}</h1>${subtitle?`<p class="view-subtitle">${subtitle}</p>`:''}</div><div class="season-stamp">S${String(state.season).padStart(2,'0')}<span>第 ${state.day} 日</span></div></div>`;}
  function rosterView(){
    const p=state.players.find(x=>x.id===state.selected)||state.players[0];
    return `${heading('SQUAD / 阵容管理','麾下武将',canInspectRoster()?'3名上阵 · 2名候补 · 点击任意武将查看档案':'3名上阵 · 2名候补 · 所有武将均领取军饷')}<div class="squad-layout roster-layout"><div><div class="lineup-grid">${state.lineup.map(id=>playerCard(state.players.find(p=>p.id===id),{lineup:true,roster:true})).join('')}</div><div class="bench-strip roster-bench"><span>候补行伍</span>${E.roster(state).filter(p=>!state.lineup.includes(p.id)).map(reserveCard).join('')}</div></div><section class="contract-panel"><div class="panel-kicker">武将档案</div><h2>${p.name}</h2>${playerStats(p)}<div class="contract-note">${p.id==='zhou'?'距离本例36岁退役节点，仅剩一次赛季年龄结算。':'年龄、评分、潜力与军饷，共同影响武将的使用价值。'}</div><div class="team-wage">军团下次日军饷 <strong>${E.wageTotal(state)}</strong> 铜钱</div></section></div>`;
  }
  function home(){
    const r=state.seasonRecord,rank=r.rank?`${r.rank}<small>/ ${r.totalTeams}</small>`:'<span class="unranked">尚未开榜</span>';
    const expected=node().action?.replace('open-','');
    const current=homePeek?familyFor(node().scene):expected;
    const tile=(id,name,sub,art,placeholder=false)=>`<button type="button" class="home-function ${current===id?'guided-target':''} ${placeholder?'is-placeholder':''}" data-homeentry="${id}" ${placeholder?'disabled':''} aria-label="${name}，${sub}"><span class="function-art tile-${art}" aria-hidden="true"></span><span class="function-title">${name}</span><span class="function-subtitle">${sub}</span><span class="function-entry">${placeholder?'敬请期待':'入内查看'} <b>${placeholder?'·':'›'}</b></span></button>`;
    return `<div class="home-board"><button type="button" class="home-league ${current==='league'?'guided-target':''}" data-homeentry="league" aria-label="诸侯联赛，第${state.season}赛季，${r.wins}胜${r.losses}负"><span class="league-illustration" aria-hidden="true"></span><div class="league-card-top"><span class="small-seal">盟</span><span>诸侯会盟 · 三将争锋</span></div><h1>诸侯联赛</h1><p class="league-season">第${state.season}赛季 <span>·</span> 第${state.day}日</p><div class="home-army"><span class="army-crest">朔</span><span>${D.teamName}<small>当前赛季战绩</small></span></div><div class="season-record"><span><strong>${r.wins}</strong>胜</span><i></i><span><strong>${r.losses}</strong>负</span></div><div class="season-rank"><span>当前排名</span><b>${rank}</b></div><div class="season-footnote">${state.completed.includes('age')?'新季启程 · 上季10胜4负，晋级已定':state.completed.includes('settle')?'本轮已结算 · 本季战绩10胜4负':'赛季末轮待结算 · 当前9胜4负'}</div><span class="league-enter">进入联赛 <b>››</b></span></button><div class="home-functions">${tile('army','军府','布阵 · 练兵 · 招募',0)}${tile('market','将市','武将交易 · 官府竞拍',1)}${tile('exchange','钱玉互兑','铜钱与玉璧 · 玩家兑换',3)}${tile('other','其他','更多军务 · 敬请期待',2,true)}</div></div>`;
  }
  function familyFor(scene){return ({squad:'army',training:'army',recruitment:'army',market:'market',auction:'market',league:'league',exchange:'exchange'})[scene]||null;}
  function familyBar(scene){
    const family=familyFor(scene),groups={army:['军府',['布阵','练兵','招募']],market:['将市',['武将交易','官府竞拍']],league:['诸侯联赛',['赛程战报','赛季战绩']],exchange:['钱玉互兑',['玩家挂单']]};
    if(!family)return `<div class="family-bar"><span>引导卷宗 <b>›</b> 军政与市价</span><small>由军师引导展开</small></div>`;
    const [title,tabs]=groups[family],selected=({squad:'布阵',training:'练兵',recruitment:'招募',market:'武将交易',auction:'官府竞拍',league:'赛程战报',exchange:'玩家挂单'})[scene];
    return `<div class="family-bar"><span>主城 <b>›</b> ${title}</span><div>${tabs.map(x=>`<span class="family-tab ${selected===x?'active':''}">${x}</span>`).join('')}</div></div>`;
  }

  function league(){const done=state.completed.includes('settle'),salary=done?state.lastSalary:E.wageTotal(state),net=D.rules.winReward-salary;return `${heading('LEAGUE / 自动联赛','赛季最后一战','常规赛第14轮 · 样例战报')}<div class="league-layout"><section class="match-panel"><div class="match-status">比赛已结束 / 演示赛果</div><div class="versus"><div class="match-team"><div class="team-emblem">朔</div><h2>${D.teamName}</h2><span>主场 / 本阵</span></div><div class="match-score"><strong>3 <i>:</i> 1</strong><span>得胜</span></div><div class="match-team"><div class="team-emblem rival">玄</div><h2>北境军团</h2><span>客场 / 对阵</span></div></div><div class="match-faces">${state.lineup.map(id=>face(state.players.find(p=>p.id===id).portrait)).join('')}<span>3V3</span>${[4,3,2].map(i=>face(i)).join('')}</div><div class="match-footer">结算后战绩 10胜4负 · 示例排名 02 / 08 · 达到晋级条件</div></section><section class="settle-panel"><div class="panel-kicker">今日结算</div><h2>${done?'结算完成':'待领取奖励'}</h2>${small('比赛奖励','＋'+D.rules.winReward+' 铜钱')}${small('军团日军饷','−'+salary+' 铜钱')}${small('本次净变化',(net>=0?'＋':'−')+num(Math.abs(net))+' 铜钱')}${primary('settle','领取奖励并支付军饷')}<p class="micro-note">军饷按结算时实际持有的在役武将计算。</p></section></div><div class="league-notes"><div><b>铜钱新增</b><span>比赛奖励进入流通</span></div><div><b>铜钱回收</b><span>军饷支出退出流通</span></div></div>`;}
  function market(){
    const p=state.players.find(member=>member.id==='xu'),done=state.completed.includes('trade'),auction=E.marketAuction(state),price=auction.currentBid,tax=Math.round(price*D.rules.tradeTax),nextBid=D.marketAuction.playerBids[auction.round]??D.rules.tradePrice;
    const leader=done?'竞拍成交 · 你竞得许衡':auction.leading==='challenger'?'当前领先 · '+D.marketAuction.challengerName:'与'+D.marketAuction.challengerName+'竞价';
    const history=Array.from({length:5},(_,index)=>{const bid=auction.bids[index];return bid?`<li data-bid-amount="${bid.amount}" class="${index===auction.bids.length-1?'is-leading':''}"><span>${bid.bidder==='you'?'你':D.marketAuction.challengerName}</span><strong>${bid.amount}<small>铜钱</small></strong></li>`:'<li class="is-pending"><span>等待报价</span><strong>—</strong></li>';}).join('');
    return `${heading('将市 · 玩家竞拍','竞拍武将，完成资产转移','成交后由卖家承担交易税 · 本次税率20%')}<div class="market-auction-layout"><div class="market-auction-details"><section class="market-main auction-listing">${playerCard(p,{roster:true})}<div class="auction-player-info"><div class="panel-kicker">武将档案</div><h2>${p.name}</h2><p class="market-asset-owner">${done?'已加入'+D.teamName:'卖方：对方领主'}</p><div class="auction-attributes">${playerStats(p)}</div></div></section><section class="bid-history"><header><span>竞价记录</span><small>${done?'其他领主停止加价，竞拍成交':'报价不扣款，成交后统一结算'}</small></header><ol>${history}</ol></section></div><section class="trade-ticket market-bid-ticket"><div class="panel-kicker">${leader}</div><div class="ticket-price"><span>${done?'成交价／买方支付':auction.bids.length?'当前最高报价':'起拍价'}</span><strong class="auction-current-price">${price}<small>铜钱</small></strong></div><p class="auction-estimate-label">${done?'成交结算':'按当前报价测算'}</p>${small('卖方交易税 20%',tax+' 铜钱')}${small('卖方实际收入',(price-tax)+' 铜钱')}${primary('trade',(auction.round===0?'出价':'加价至')+nextBid+'铜钱')}<p class="auction-payment-note">${done?'你支付300铜钱，卖家实收240。':'仅成交时付款，交易税由卖家承担。'}</p></section></div>`;
  }
  function exchange(){
    const buying=['exchange-rise','exchange-back','exchanged-back'].includes(node().id),quote=buying?D.exchangeQuotes.buy:D.exchangeQuotes.sell,done=state.completed.includes(quote.action),principal=quote.quantity*quote.rate;
    const rows=buying?[[26,20],[25.5,20],[25.2,20],[quote.rate,quote.quantity]]:[[quote.rate,quote.quantity],[19.9,30],[19.8,20],[19.7,10]];
    const subtitle=buying?'上次每玉璧20铜钱 → 当前25铜钱 · 上涨25%':'玩家间挂单交易 · 卖出初始持有的玉璧';
    return `${heading('铜钱玉璧兑换',buying?'按新报价买回玉璧':'以玉璧换取铜钱',subtitle)}<div class="exchange-layout anonymous-exchange"><section class="exchange-board"><div class="panel-kicker">样例市场${buying?'卖':'买'}单</div><div class="exchange-price"><span>1玉璧 / 铜钱</span><strong>${quote.rate.toFixed(2)}</strong><span>${buying?'当前报价 · 较上次上涨25%':'首次报价'}</span></div><div class="order-table"><div><span>${buying?'卖':'买'}单价格</span><span>数量 / 玉璧</span></div>${rows.map(([rate,quantity])=>`<div class="${rate===quote.rate?'matched':'dim'}"><span>${rate.toFixed(2)}</span><span>${quantity}${rate===quote.rate?' ← '+(done?'已成交':buying?'本次买入':'本次卖出'):''}</span></div>`).join('')}</div><p class="micro-note">${done?'本次挂单已撮合。':'预设市场挂单，按下方引导完成兑换。'}</p></section><section class="exchange-ticket"><div class="panel-kicker">我的账户</div><div class="exchange-wallet"><div><span>铜钱余额</span><strong>${num(state.accounts.you.gold)}<small>铜钱</small></strong></div><div><span>玉璧余额</span><strong>${state.accounts.you.diamonds}<small>玉璧</small></strong></div></div>${small(buying?'买入数量':'卖出数量',quote.quantity+' 玉璧')}${small(buying?'支付铜钱':'获得铜钱',num(principal)+' 铜钱')}<div class="exchange-actions">${primary(quote.action,buying?`支付${num(principal)}铜钱，买回${quote.quantity}玉璧`:`卖出${quote.quantity}玉璧，获得${num(principal)}铜钱`)}</div><div class="transaction-note">成交仅转移已有货币，兑换环节不增发铜钱或玉璧。</div></section></div>`;
  }

  function economicOverview(){
    const flow=value=>'<span class="flow-value '+(value==='增加'?'is-increase':value==='减少'?'is-decrease':'is-transfer')+'">'+(value==='增加'?'＋ ':value==='减少'?'− ':'')+value+'</span>';
    return '<section class="document-page overview-document">'+heading('经济设计总览','各类行为分别改变什么','全局总量口径 · 局内金币对应铜钱，充值货币对应玉璧')+'<div class="behavior-table-panel"><table class="behavior-table"><thead><tr><th scope="col">游戏行为</th><th scope="col">局内金币总量</th><th scope="col">充值货币总量</th><th scope="col">核心资产的变化</th></tr></thead><tbody>'+behaviorRows.map(row=>'<tr><th scope="row">'+esc(row[0])+'</th><td>'+flow(row[1])+'</td><td>'+flow(row[2])+'</td><td>'+esc(row[3])+'</td></tr>').join('')+'</tbody></table><p class="behavior-table-note">“不变”指全体玩家的总量；持有人、资产品质与使用价值仍可能变化。</p></div></section>';
  }
  function economicSummary(){
    const article=summaryParagraphs.map(text=>'<p>'+esc(text).replace(/(游玩收益、成长支出与长期积累|货币投放与回收|正常价值变化|交易本金在玩家之间转移|玩家已经持有的货币|数量、品质与退出节奏)/g,'<strong>$1</strong>')+'</p>').join('');
    return '<section class="document-page summary-document">'+heading('经济设计总结','让玩法、资产与货币形成循环','从参与玩法，到持有、交易和更新资产')+'<button class="button sim-return" data-sim-return>返回经济实验</button><article class="design-article" aria-label="完整经济设计总结"><div class="design-article-body">'+article+'</div></article></section>';
  }

  function economicSimulation(){return '<section class="sim-page"><header class="sim-heading"><div><h1>军府经济实验</h1><p>40名领主 · 十季经营 · 政策影响从实际账本中产生</p></div><span class="sim-seal">经济沙盘</span></header><div id="sim-host"></div></section>';}
  function trainingView(){const p=state.players.find(p=>p.id==='lin'),done=state.completed.includes('train');return `${heading('军府 · 练兵','校场磨砺，将才渐成','训练与布阵同属军府，寻访在军府招募页展开')}<div class="training-layout"><section class="training-card"><div class="training-profile">${face(0)}<div><span class="tier">青年将才</span><h2>林川</h2><p>${p.age}岁 · 潜力88</p></div></div>${small('当前战力',p.ability)}${small('已投入培养进度',p.training+' / 1')}<div class="training-meter"><span style="width:${done?100:12}%"></span></div><p>本例训练进度在下一次赛季成长时兑现，培养需要投入，也需要时间。</p>${primary('train','使用练兵军资 · 10玉璧')}</section><section class="training-notes"><div class="small-seal">练</div><h2>军饷与成长</h2><p>武将军饷按当前实力分档，训练与年龄成长可能使其进入更高档位。</p><p>青年成长、巅峰使用、衰退退役，构成一份有使用期限的武将资产。</p><div class="training-objects" aria-hidden="true"></div></section></div>`;}
  function recruitmentView(){const scouted=state.completed.includes('scout');return `${heading('军府 · 招募','寻访后备将才，补充行伍','玉璧寻访 · 新增武将进入军团')}<div class="training-layout"><section class="scout-card"><div class="panel-kicker">寻访名册</div><div class="scout-radar"><span></span><span></span><b>${scouted?'已得后备将才':'寻访可造之材'}</b></div>${scouted?`<div class="scout-result">${face(3)}<div><strong>许星</strong><p>17岁 · 评分55 · 潜力84 · 已入军府</p></div></div>`:'<p>以玉璧寻访新人，将付费货币消耗与武将供给相连接。</p>'}${primary('scout','寻访一名将才 · 20玉璧')}</section><section class="training-notes"><div class="small-seal">访</div><h2>消耗玉璧，补充行伍</h2><p>本次寻访消耗20玉璧，系统新增一名武将；铜钱总量保持不变。</p><p>寻访频率与投放数量共同影响武将供给，获得的武将仍需持续支付军饷。</p>${small('本次寻访支出','20 玉璧')}${small('本次新增武将',scouted?'许星 · 已入军府':'1 名')}</section></div>`;}
  function auctionView(){
    const p=state.players.find(member=>member.id==='rare')||D.additions.rare,done=state.completed.includes('auction'),auction=E.officialAuction(state),nextBid=D.officialAuction.buyerBids[auction.round]??D.rules.auctionPrice;
    const leader=done?'竞拍成交 · 你竞得唐晟':auction.leading==='challenger'?'当前领先 · 其他领主':'你与其他领主竞价';
    const history=Array.from({length:5},(_,index)=>{const bid=auction.bids[index];return bid?`<li data-official-bid="${bid.amount}" class="${index===auction.bids.length-1?'is-leading':''}"><span>${bid.bidder==='you'?D.officialAuction.buyerName:D.officialAuction.challengerName}</span><strong>${num(bid.amount)}<small>铜钱</small></strong></li>`:'<li class="is-pending"><span>等待报价</span><strong>—</strong></li>';}).join('');
    return `${heading('将市 · 官府竞拍','竞价招募，回收铜钱','官府投放新武将 · 成交款全额退出流通')}<div class="market-auction-layout official-auction-layout"><div class="market-auction-details"><section class="market-main auction-listing">${playerCard(p,{roster:true})}<div class="auction-player-info"><div class="panel-kicker">官府稀有武将</div><h2>${p.name}</h2><p class="market-asset-owner">${done?'已加入朔风军':'由官府投放，成交后入营'}</p><div class="auction-attributes">${playerStats(p)}</div></div></section><section class="bid-history"><header><span>竞价记录</span><small>${done?'其他领主停止加价，落槌成交':'报价阶段不扣款、不新增武将'}</small></header><ol>${history}</ol></section></div><section class="trade-ticket market-bid-ticket"><div class="panel-kicker">${leader}</div><div class="ticket-price"><span>${done?'最终成交价':auction.bids.length?'当前最高报价':'起拍价'}</span><strong class="official-current-price">${num(auction.currentBid)}<small>铜钱</small></strong></div>${small('你的可用铜钱',num(state.accounts.you.gold))}${small('成交款去向','官府全额回收')}${small('成交后武将供给','新增 1 名')}${primary('auction',(auction.round===0?'出价':'加价至')+num(nextBid)+'铜钱')}<p class="auction-payment-note">${done?'已回收1,000铜钱，唐晟进入你的军团。':'报价时不扣款，成交后由你支付价款。'}</p></section></div>`;
  }
  const scenes={home,squad:rosterView,league,market,exchange,training:trainingView,recruitment:recruitmentView,auction:auctionView,overview:economicOverview,simulation:economicSimulation,summary:economicSummary};
  function modalView(){if(!modal)return '';let body='',title='';
    if(modal==='history'){title='助手对话记录';body=lines.slice(0,cursor+1).map((n,i)=>`<div class="history-entry"><span>${String(i+1).padStart(2,'0')} / ${D.chapters[n.chapter]}</span><p>${n.text}</p></div>`).join('');}
    else if(modal==='reset'){title='重新开始引导';body='<p>这会清除当前浏览器中本作品的演示进度，恢复初始军团与账本。</p><div class="modal-actions"><button class="button" data-close>继续当前进度</button><button class="button primary" data-reset>重新开始</button></div>';}
    else{title='完整主线账本';body=`<p class="micro-note">记录本次已完成的货币结算与资产变化。</p><div class="table-wrap"><table><thead><tr><th>事件</th><th>铜钱净变化</th><th>玉璧净变化</th><th>资产净变化</th></tr></thead><tbody>${state.ledger.map(e=>`<tr><td>${e.label}</td><td>${e.gold}</td><td>${e.diamonds}</td><td>${e.players}</td></tr>`).join('')}</tbody></table></div>`;}
    return `<div class="modal-backdrop"><section class="modal-window" role="dialog" aria-modal="true" aria-label="${title}"><header><h2>${title}</h2><button class="icon-button" data-close aria-label="关闭对话框">×</button></header><div class="modal-body">${body}</div></section></div>`;
  }
  function render(){
    while(cursor<lines.length-1&&node().action&&!node().action.startsWith('open-')&&state.completed.includes(node().action))cursor++;
    const n=node(),scene=homePeek?'home':n.scene,chapter=n.chapter,done=cursor===lines.length-1,opening=n.id==='welcome'&&!homePeek,documentPage=['overview','summary','simulation'].includes(scene);
    root.innerHTML=`<div class="game-shell ${scene==='home'?'is-home':scene==='simulation'?'is-simulation':''} ${documentPage?'is-document':''} ${opening?'is-opening':''} ${n.id==='exchange-intro'&&!homePeek?'is-exchange-intro':''}"><header class="topbar"><div class="brand"><span class="brand-mark">策</span><div><strong>烽策</strong><small>诸侯会盟 · 三将争锋</small></div></div><span class="build-label">离线卷册 <i>·</i> v0.2</span><div class="topbar-end">${scene!=='home'?'<button class="button home-return" data-home>返回主城</button>':homePeek?'<button class="button home-return" data-resume>返回当前引导</button>':''}<div class="currency gold"><span class="coin-symbol">钱</span><b>${scene==='simulation'?'40':num(state.accounts.you.gold)}</b><small>${scene==='simulation'?'领主':'铜钱'}</small></div><div class="currency diamond"><span class="diamond-symbol">◎</span><b>${scene==='simulation'?'120':num(state.accounts.you.diamonds)}</b><small>${scene==='simulation'?'天':'玉璧'}</small></div><button class="icon-button fullscreen-button" data-fullscreen aria-label="全屏体验">⛶</button><button class="icon-button" data-modal="history" aria-label="回看军师对话">≡</button><button class="icon-button" data-modal="reset" aria-label="重新开始">↻</button></div></header><div class="play-layout"><main class="stage">${scene!=='home'&&!documentPage?familyBar(scene):''}<div class="stage-content">${scenes[scene]()}</div></main></div><section class="assistant-dock" aria-label="军师新手引导"><div class="assistant-identity">${face(5)}<div><b>岚</b><span>军务参佐</span></div></div><div class="assistant-conversation"><div class="dialogue-meta"><span>${String(chapter+1).padStart(2,'0')} / ${String(D.chapters.length).padStart(2,'0')}　${D.chapters[chapter]}</span><span>${cursor+1} / ${lines.length}</span></div>${opening?openingContent():`<p class="assistant-text" aria-live="polite">${homePeek?(done?'主公，此卷已阅。可返回当前引导查阅完整账簿、回看对话，或从头重演。':'主公，这是当前主城总览。请从高亮入口返回本步引导，其余入口将在固定流程中依次展示。'):documentPage?documentIntro[scene]:n.text}</p>`}<div class="dialogue-track" role="progressbar" aria-label="引导进度" aria-valuemin="0" aria-valuemax="${lines.length}" aria-valuenow="${cursor+1}"><span style="width:${(cursor+1)/lines.length*100}%"></span></div></div><div class="dialogue-controls">${homePeek?'<button class="button primary" data-resume>返回当前引导</button>':`<button class="button next-button ${n.action?'waiting':'primary'}" data-next ${n.action||done?'disabled':''}>${done?'此卷已阅':n.action?'请操作高亮目标':opening?'开始引导 →':n.id==='economic-overview'?'进入经济实验 →':n.id==='economic-simulation'?'阅读设计总结 →':canInspectRoster()?'查看完毕，继续 →':'下一句 →'}</button>`}<span>${done?'可回看对话或查阅账簿':n.action?'完成本步后继续':opening?'阅读后进入军府引导':canInspectRoster()?'可自由查看五名武将':'点击推进对话'}</span></div></section><footer class="build-footer"><span>固定流程 · 半写实二维贴图 · 架空经济设计说明</span><button data-modal="ledger">查阅账簿 ↗</button></footer></div>${modalView()}${toast?`<div class="toast" role="status">${esc(toast)}</div>`:''}`;
    root.querySelector('.game-shell')?.toggleAttribute('inert',Boolean(modal));fitCanvas();save();if(scene==='simulation')window.FengceSimUI?.mount();
    requestAnimationFrame(()=>{
      if(modal){root.querySelector('[data-close]')?.focus();return;}
      const stage=root.querySelector('.stage'),target=root.querySelector('.guided-target');
      if(stage&&lastScene!==scene)stage.scrollTop=0;
      if(stage&&target){const a=stage.getBoundingClientRect(),b=target.getBoundingClientRect(),scale=a.width/(stage.clientWidth||a.width);if(b.bottom>a.bottom-16)stage.scrollTop+=(b.bottom-a.bottom+16)/scale;else if(b.top<a.top+16)stage.scrollTop-=(a.top+16-b.top)/scale;}
      lastScene=scene;
    });
  }

  function advance(){const n=node();if(n.action||cursor>=lines.length-1)return;cursor++;render();}
  function complete(action){const n=node();if(n.action!==action)return;
    try{
      const before=E.totals(state);
      if(action==='trade'){
        const bid=E.bidMarket(state);
        if(!bid.settled){toast=`你出价${bid.offer}铜钱，其他领主加价至${bid.challengerBid}。请继续竞价。`;render();setTimeout(()=>{toast='';root.querySelector('.toast')?.remove();},2200);return;}
      }else if(action==='auction'){
        const bid=E.bidOfficial(state);
        if(!bid.settled){toast=`你出价${bid.offer}铜钱，其他领主加价至${bid.challengerBid}。`;render();setTimeout(()=>{toast='';root.querySelector('.toast')?.remove();},2200);return;}
      }else if(!action.startsWith('open-'))E.act(state,action);
      if(!E.validate(state))throw new Error('账本核对失败，操作已停止。');
      const after=E.totals(state);const notices=[];if(after.gold!==before.gold)notices.push(`整体铜钱 ${after.gold-before.gold>0?'+':''}${after.gold-before.gold}`);if(after.diamonds!==before.diamonds)notices.push(`整体玉璧 ${after.diamonds-before.diamonds>0?'+':''}${after.diamonds-before.diamonds}`);if(after.players!==before.players)notices.push(`在役武将 ${after.players-before.players>0?'+':''}${after.players-before.players}`);
      toast=notices.length?notices.join('　'):'本步已完成';previousTotals=after;
      cursor=Math.min(cursor+1,lines.length-1);render();setTimeout(()=>{toast='';root.querySelector('.toast')?.remove();},2200);
    }catch(error){toast=error.message;render();}
  }
  root.addEventListener('click',event=>{
    const target=event.target.closest('button');if(!target||target.disabled)return;
    if(target.hasAttribute('data-sim-return')){cursor=lines.findIndex(n=>n.id==='economic-simulation');homePeek=false;render();return;}
    if(target.hasAttribute('data-home')){homePeek=true;render();return;}
    if(target.hasAttribute('data-resume')){homePeek=false;render();return;}
    if(target.dataset.homeentry){const entry=target.dataset.homeentry;if(homePeek&&familyFor(node().scene)===entry){homePeek=false;render();return;}if(!homePeek&&node().action==='open-'+entry){complete('open-'+entry);return;}toast='本卷按固定流程推进，请先完成军师当前指引。';render();setTimeout(()=>{toast='';root.querySelector('.toast')?.remove();},2200);return;}
    if(target.hasAttribute('data-fullscreen')){if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{});else document.getElementById('viewport-root').requestFullscreen?.().catch(()=>{});return;}
    if(target.dataset.modal){modal=target.dataset.modal;render();return;}
    if(target.hasAttribute('data-close')){modal=null;render();return;}
    if(target.hasAttribute('data-reset')){state=E.initial();cursor=0;modal=null;toast='';homePeek=false;render();return;}
    if(target.hasAttribute('data-next')){advance();return;}
    if(target.dataset.player){if(canInspectRoster()&&E.roster(state).some(member=>member.id===target.dataset.player)){state.selected=target.dataset.player;render();}return;}
    if(target.dataset.act)complete(target.dataset.act);
  });
  root.addEventListener('keydown',event=>{if(event.key==='Escape'&&modal){modal=null;render();}});
  render();
  // Limited diagnostics for local checks: no network or host integration.
  window.SquadApp={getState:()=>E.copy(state),getCursor:()=>cursor,getNode:()=>({...node()}),getLines:()=>E.copy(lines),restart:()=>{state=E.initial();cursor=0;modal=null;homePeek=false;render();}};
})();

