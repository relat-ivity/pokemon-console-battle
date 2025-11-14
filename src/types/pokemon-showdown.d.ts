/**
 * Pokemon Showdown 类型补充
 * 用于修复第三方库缺失的类型定义
 */

// 全局声明 AnyObject，供 pokemon-showdown 库使用
declare global {
  interface AnyObject { [k: string]: any }
}

export {};

