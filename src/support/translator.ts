import * as fs from 'fs';
import * as path from 'path';

type Translations = Record<string, Record<string, string>>;

export class Translator {
  private static instance: Translator;
  private lang: string;
  private translations: Translations = {};
  private translationPath: string;

  private constructor(lang: string = 'cn') {
    this.lang = lang;
    this.translationPath = path.join(__dirname, `../../data/translations-${lang}.json`);
    this.loadTranslations();
  }

  public static getInstance(lang: string = 'cn'): Translator {
    if (!Translator.instance) {
      Translator.instance = new Translator(lang);
    } else if (Translator.instance.lang !== lang) {
      Translator.instance.lang = lang;
      Translator.instance.translationPath = path.join(__dirname, `../../data/translations-${lang}.json`);
      Translator.instance.loadTranslations();
    }
    return Translator.instance;
  }

  private loadTranslations(): void {
    try {
      if (fs.existsSync(this.translationPath)) {
        this.translations = JSON.parse(fs.readFileSync(this.translationPath, 'utf8'));
      } else {
        console.log(`⚠ 未找到翻译文件: ${this.translationPath}，将使用英文显示\n`);
      }
    } catch (error: any) {
      console.log('⚠ 加载翻译文件失败:', error.message);
      console.log('  将使用英文显示\n');
      this.translations = {};
    }
  }

  public translate(text: string, category: string = 'moves'): string {
    const map = this.translations[category];
    
    if (category === 'pokemon') {
      // 情况1: 带括号的宝可梦名字，例如: "Tauros-Paldea-Blaze (Tauros)"
      // 翻译格式：中文基础名 (英文形态名)
      if (text.includes('(') && text.includes(')')) {
        const match = text.match(/^(.+?)\s*\((.+?)\)$/);
        if (match) {
          const formName = match[1].trim();  // "Tauros-Paldea-Blaze"
          const baseName = match[2].trim();  // "Tauros"
          
          // 翻译基础名称
          const translatedBase = map?.[baseName] || baseName;
          
          // 输出格式：中文基础名 (英文形态名)
          return `${translatedBase} (${formName})`;
        }
      }
      
      // 情况2: 不带括号但有连字符的形态名，例如: "Ogerpon-Hearthflame"
      // 翻译格式：中文基础名 (英文形态名)
      if (text.includes('-')) {
        // 先尝试完整翻译
        const directTranslation = map?.[text];
        if (directTranslation) {
          return directTranslation;
        }
        
        // 如果没有完整翻译，提取基础名称
        const baseName = text.split('-')[0];
        const translatedBase = map?.[baseName];
        
        // 如果基础名称有翻译，添加括号显示完整形态名
        if (translatedBase && translatedBase !== baseName) {
          return `${translatedBase} (${text})`;
        }
      }
    }
    
    return map?.[text] || text;
  }
}
