export const BUDGETS=['20','30','50'];
export const TASTES=['any','light','spicy'];
const plain=(value,max)=>typeof value==='string'&&value.trim()===value&&Array.from(value).length>=1&&Array.from(value).length<=max&&!/[<>\u0000-\u001f\u007f]/.test(value);
export function validatePreferences(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['budget','taste','avoid'].includes(k)))throw Error('请选择预算、口味，并填写有效的忌口。');
 if(!BUDGETS.includes(value.budget)||!TASTES.includes(value.taste)||!Array.isArray(value.avoid)||value.avoid.length>5||value.avoid.some(x=>!plain(x,12)))throw Error('忌口最多 5 项，每项最多 12 个字。');
 return {budget:value.budget,taste:value.taste,avoid:[...new Set(value.avoid)]};
}
const aliases={海鲜:['虾','蟹','鱼','贝','蚝','蛤','鱿鱼','海鲜'],花生:['花生'],牛奶:['牛奶','奶油','奶酪','乳酪','乳粉','黄油'],鸡蛋:['鸡蛋','蛋黄','蛋白','鸭蛋','鹅蛋','鹌鹑蛋'],大豆:['大豆','黄豆','豆腐','豆浆','豆皮','腐竹','酱油'],小麦:['小麦','面粉','面条','馒头','饺子','面包']};
export function validateOptions(value,preferences){
 if(!value||Object.keys(value).length!==1||!Array.isArray(value.options)||value.options.length!==3)throw Error('推荐格式不完整，请重试。');
 const names=new Set(),blocked=preferences.avoid.flatMap(x=>[x,...(aliases[x]||[])]);
 return value.options.map(item=>{
  if(!item||Object.keys(item).some(k=>!['name','reason','ingredients'].includes(k))||!plain(item.name,8)||!plain(item.reason,60)||!Array.isArray(item.ingredients)||item.ingredients.length<1||item.ingredients.length>12||item.ingredients.some(x=>!plain(x,12)))throw Error('推荐格式不完整，请重试。');
  if(names.has(item.name))throw Error('推荐有重复，请重试。');names.add(item.name);
  const text=[item.name,item.reason,...item.ingredients].join(' ').normalize('NFKC').toLowerCase();
  if(blocked.some(x=>text.includes(x.normalize('NFKC').toLowerCase())))throw Error('推荐未满足忌口条件，请重试。');
  return {name:item.name,reason:item.reason,ingredients:[...item.ingredients]};
 });
}
