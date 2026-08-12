const SIZES  = ["1","2","3","4","5","6","7","新3.5","新4","新5","廃棄"];
const FLOORS = ["本校1F","本校2F","本校3F","新校1F","新校2F"];
const FLOOR_COLORS = {
  "本校1F":["#fde8e8","#c0392b"], "本校2F":["#e8f0fd","#2980b9"], "本校3F":["#fdeee8","#c0732b"],
  "新校1F":["#e8fde8","#27ae60"], "新校2F":["#f0e8fd","#8e44ad"]
};
const TYPES = {
  normal:  { label:"🏫 通常教室", color:"#1a1a2e", bg:"#f0f0f0" },
  storage: { label:"📦 保管室",   color:"#27ae60", bg:"#e8fde8" },
  special: { label:"🎵 特別教室", color:"#e67e22", bg:"#fdf5e8" },
};

const mkStock = id => ({
  id,
  deskLines:         [{size:"4",count:0}],
  chairLines:        [{size:"4",count:0}],
  needDeskLines:     [{size:"4",count:0}],
  needChairLines:    [{size:"4",count:0}],
  discardDeskLines:  [{size:"4",count:0}],
  discardChairLines: [{size:"4",count:0}],
});

const INIT_ROOMS = [
  {id:1, floor:"本校3F",old:"４－１",      nw:"４－１",     students:28,teacher:"石井", type:"normal"},
  {id:2, floor:"本校3F",old:"４－２",      nw:"４－２",     students:28,teacher:"",     type:"normal"},
  {id:3, floor:"本校3F",old:"４－３",      nw:"４－３",     students:27,teacher:"",     type:"normal"},
  {id:4, floor:"本校3F",old:"４－４",      nw:"４－４",     students:27,teacher:"",     type:"normal"},
  {id:5, floor:"本校1F",old:"算数教室",    nw:"３－１",     students:35,teacher:"島村", type:"normal"},
  {id:6, floor:"本校1F",old:"３－３",      nw:"３－２",     students:35,teacher:"安部", type:"normal"},
  {id:7, floor:"本校1F",old:"３－４",      nw:"３－３",     students:35,teacher:"",     type:"normal"},
  {id:8, floor:"新校1F",old:"３－１",      nw:"５－４",     students:28,teacher:"椎野", type:"normal"},
  {id:9, floor:"新校1F",old:"５－４",      nw:"５－３",     students:28,teacher:"坪田", type:"normal"},
  {id:10,floor:"新校2F",old:"５－１",      nw:"５－１",     students:28,teacher:"",     type:"normal"},
  {id:11,floor:"新校2F",old:"５－２",      nw:"５－２",     students:27,teacher:"",     type:"normal"},
  {id:12,floor:"本校2F",old:"１－１",      nw:"１－１",     students:31,teacher:"槙本", type:"normal"},
  {id:13,floor:"本校2F",old:"１－２",      nw:"１－２",     students:30,teacher:"",     type:"normal"},
  {id:14,floor:"本校2F",old:"１－３",      nw:"１－３",     students:30,teacher:"",     type:"normal"},
  {id:15,floor:"本校2F",old:"多目的室",    nw:"算数教室2",  students:35,teacher:"藤沼", type:"normal"},
  {id:16,floor:"本校2F",old:"低学年音楽室",nw:"２－１",     students:27,teacher:"立山", type:"normal"},
  {id:17,floor:"本校2F",old:"２－１",      nw:"２－２",     students:27,teacher:"",     type:"normal"},
  {id:18,floor:"本校2F",old:"２－２",      nw:"２－３",     students:26,teacher:"",     type:"normal"},
  {id:19,floor:"本校3F",old:"６－１",      nw:"６－１",     students:33,teacher:"菊地", type:"normal"},
  {id:20,floor:"本校3F",old:"６－２",      nw:"６－２",     students:33,teacher:"",     type:"normal"},
  {id:21,floor:"本校3F",old:"６－３",      nw:"６－３",     students:33,teacher:"",     type:"normal"},
  {id:22,floor:"本校3F",old:"くぬぎ１",    nw:"６－４",     students:33,teacher:"小川", type:"normal"},
  {id:23,floor:"本校2F",old:"多目的室",    nw:"多目的室",   students:0, teacher:"",     type:"storage"},
  {id:24,floor:"本校3F",old:"第二音楽室",  nw:"第二音楽室", students:0, teacher:"",     type:"storage"},
];

const INIT_LAYOUT_OLD = `【現在の教室配置（令和7年度）西→東の順】
本校3F：音楽室・音楽準備室 ｜ ６の１・６の２・６の３・くぬぎ１（6年4クラス） ｜ 3F算数少人数 ｜ ４の１・図工室・４の２・４の３・４の４（4年4クラス） ｜ 第二音楽室
本校2F：生活科室 ｜ １の１・１の２・１の３（1年3クラス） ｜ 2F算数少人数 ｜ 低学年音楽室・２の１・２の２・２の３・くぬぎ教室×2（2年3クラス） ｜ くぬぎ職員室・作品保管室・図書室 ｜ 多目的室
本校1F：サポートルーム・保健室・視聴覚室・放送室・職員室・校長室・事務室 ｜ 算数教室・３の３・３の４
新校舎1F：家庭科室 ｜ ３の１・５の４ ｜ 体育館
新校舎2F：５の１・５の２・５の３・新校舎算数少人数
※本校と新校舎は渡り廊下で連絡。`;

const INIT_LAYOUT_NEW = `【来年度の教室配置（令和8年度）西→東の順】
本校3F：音楽室・音楽準備室 ｜ ６の１・６の２・６の３・６の４（6年4クラス） ｜ 3F算数少人数 ｜ ４の１・図工室・４の２・４の３・４の４（4年4クラス）
本校2F：生活科室 ｜ １の１・１の２・１の３（1年3クラス） ｜ 2F算数少人数 ｜ ２の１・２の２・２の３・くぬぎ教室×2（2年3クラス）・理科室 ｜ くぬぎ職員室・作品保管室・図書室
本校1F：サポートルーム・保健室・視聴覚室・放送室・職員室・校長室・事務室 ｜ 多目的室（保管室）・５の２・５の１
新校舎1F：家庭科室 ｜ ３の１・３の２・３の３（3年3クラス） ｜ 体育館
新校舎2F：５の３・５の４・新校舎算数少人数`;

