function createStorage(platform){
 return {
  getItem(key){const value=platform.getStorageSync(key);return value===''||value===undefined?null:String(value);},
  setItem(key,value){platform.setStorageSync(key,String(value));},
  removeItem(key){platform.removeStorageSync(key);},
  key(index){return platform.getStorageInfoSync().keys[index]??null;},
  get length(){return platform.getStorageInfoSync().keys.length;}
 };
}
module.exports={createStorage};
