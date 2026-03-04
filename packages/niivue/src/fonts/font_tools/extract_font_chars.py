import sys
from fontTools.ttLib import TTFont

def extract_chars_from_font(font_path, output_txt_path):
    try:
        # 1. 打开字体文件
        font = TTFont(font_path)
        
        # 2. 获取最佳字符映射表 (cmap)
        # cmap 字典的结构是 {unicode_integer: glyph_name}
        cmap = font.getBestCmap()
        
        if not cmap:
            print("错误：未在字体中找到字符映射表。")
            return

        # 3. 提取所有字符的 Unicode 编码并排序
        # cmap.keys() 自动保证了字符是不重复的
        codes = sorted(cmap.keys())
        
        # 4. 将编码转换为字符
        # 注意：我们会过滤掉一些特殊的控制字符（如空字符），以免影响文本文件显示
        chars = []
        for code in codes:
            # 过滤掉 NULL (0) 和一些不可见的控制字符，保留常用字符
            if code > 0: 
                chars.append(chr(code))

        # 5. 拼接成一个长字符串
        full_text = "".join(chars)

        # 6. 写入 UTF-8 编码的文本文件
        with open(output_txt_path, "w", encoding="utf-8") as f:
            f.write(full_text)

        print(f"成功！")
        print(f"共提取了 {len(chars)} 个字符。")
        print(f"结果已保存至: {output_txt_path}")

    except Exception as e:
        print(f"发生错误: {e}")

# --- 配置部分 ---

# 修改这里：你的字体文件路径 (支持 .ttf 或 .otf)
my_font_file = "your_font.ttf" 

# 修改这里：输出的文本文件名
output_file = "all_characters.txt"

# 运行函数
if __name__ == "__main__":
    # 如果你想通过命令行传参： python script.py font.ttf
    if len(sys.argv) > 1:
        my_font_file = sys.argv[1]
    
    extract_chars_from_font(my_font_file, output_file)