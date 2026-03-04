import sys
from fontTools.ttLib import TTFont

def extract_chars_from_font(font_path, output_txt_path):
    try:
        # 1. Open the font file
        font = TTFont(font_path)
        
        # 2. Get the best character map (cmap)
        # The cmap dictionary structure is {unicode_integer: glyph_name}
        cmap = font.getBestCmap()
        
        if not cmap:
            print("Error: No character map found in the font.")
            return

        # 3. Extract and sort all Unicode code points
        # cmap.keys() automatically ensures characters are unique
        codes = sorted(cmap.keys())
        
        # 4. Convert code points to characters
        # Note: We filter out special control characters (like NULL) to prevent text file display issues
        chars =[]
        for code in codes:
            # Filter out NULL (0) and some invisible control characters, keeping common ones
            if code > 0: 
                chars.append(chr(code))

        # 5. Concatenate into a single long string
        full_text = "".join(chars)

        # 6. Write to a UTF-8 encoded text file
        with open(output_txt_path, "w", encoding="utf-8") as f:
            f.write(full_text)

        print(f"Success!")
        print(f"Extracted a total of {len(chars)} characters.")
        print(f"Result saved to: {output_txt_path}")

    except Exception as e:
        print(f"An error occurred: {e}")

# --- Configuration section ---

# Modify here: Your font file path (supports .ttf or .otf)
my_font_file = "your_font.ttf" 

# Modify here: The output text file name
output_file = "all_characters.txt"

# Run the function
if __name__ == "__main__":
    # If you want to pass arguments via command line: python script.py font.ttf
    if len(sys.argv) > 1:
        my_font_file = sys.argv[1]
    
    extract_chars_from_font(my_font_file, output_file)