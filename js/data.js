(function(global){
  'use strict';
  const bands=[{max:60,wage:20},{max:69,wage:25},{max:79,wage:30},{max:89,wage:40},{max:100,wage:50}];
  const members=[
    {id:'lin',owner:'you',name:'林川',grade:'B',age:18,ability:61,potential:88,role:'先锋',portrait:0,training:0},
    {id:'gu',owner:'you',name:'顾言',grade:'A',age:25,ability:78,potential:84,role:'统帅',portrait:1,training:0},
    {id:'zhou',owner:'you',name:'周远',grade:'A',age:35,ability:82,potential:83,role:'守将',portrait:2,training:0},
    {id:'he',owner:'you',name:'何越',grade:'B',age:24,ability:68,potential:76,role:'辅军',portrait:4,training:0},
    {id:'yan',owner:'you',name:'严澈',grade:'B',age:21,ability:70,potential:80,role:'斥候',portrait:3,training:0,injured:true},
    {id:'xu',owner:'rival',name:'许衡',grade:'B',age:21,ability:66,potential:81,role:'辅军',portrait:4,training:0},
    {id:'chen',owner:'rival',name:'陈启',grade:'A',age:24,ability:79,potential:84,role:'统帅',portrait:1,training:0},
    {id:'luo',owner:'rival',name:'罗星',grade:'A',age:26,ability:80,potential:82,role:'先锋',portrait:0,training:0},
    {id:'qin',owner:'rival',name:'秦牧',grade:'A',age:27,ability:81,potential:83,role:'守将',portrait:2,training:0},
    {id:'wu',owner:'rival',name:'吴承',grade:'A',age:25,ability:83,potential:86,role:'斥候',portrait:3,training:0}
  ];
  const additions={
    rookie:{id:'rookie',owner:'you',name:'许星',grade:'B',age:17,ability:55,potential:84,role:'先锋',portrait:3,training:0},
    box:{id:'box',owner:'you',name:'陆泽',grade:'B',age:20,ability:60,potential:75,role:'守将',portrait:0,training:0},
    rare:{id:'rare',owner:'you',name:'唐晟',grade:'S',age:25,ability:92,potential:96,role:'统帅',portrait:4,training:0}
  };
  const initialHealth={lin:100,gu:74,zhou:48,he:78,yan:56};
  for(const member of [...members,...Object.values(additions)])member.health=initialHealth[member.id]??100;
  global.SquadData={version:'0.2.0',flowRevision:'28-actions-then-overview-and-summary',currencyRevision:'initial-jade-100-sell-20-buy-25',economyRevision:'salary-20-50-win-200-roster-70-no-pvp',exchangeRevision:'anonymous-market-no-fee',rosterRevision:'he-active-yan-70-health-five',initialLineup:['he','gu','zhou'],saveKey:'squad-economy-local-v02',title:'烽策',teamName:'朔风军',wageBands:bands,members,additions,
    rules:{activeSize:3,seasonDays:14,retirementAge:36,agePerSeason:1,winReward:200,lossReward:80,tradePrice:300,tradeTax:.20,initialDiamonds:100,marketGold:2000,trainingCost:10,scoutingCost:20,auctionPrice:1000},
    exchangeQuotes:{sell:{action:'exchange',rate:20,quantity:100},buy:{action:'exchange-back',rate:25,quantity:40}},
    marketAuction:{openingBid:100,playerBids:[100,200,300],bidIncrement:50,challengerName:'其他领主'},
    officialAuction:{openingBid:200,buyerBids:[200,600,1000],bidIncrement:200,buyerName:'你',challengerName:'其他领主'},
    chapters:['执掌军府','布阵与契书','联赛结算','武将交易','售玉换钱','官府竞拍','买回玉璧','练兵与招募','经济设计总览'],

  };
})(typeof window!=='undefined'?window:globalThis);
