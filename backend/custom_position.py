# Funcții pentru procesarea subtitrărilor cu poziție personalizată

def hex_to_ass_color(hex_color):
    """Convert hex color to ASS color format."""
    if hex_color.startswith('#'):
        hex_color = hex_color[1:]
    
    if len(hex_color) == 6:
        r = int(hex_color[0:2], 16)
        g = int(hex_color[2:4], 16)
        b = int(hex_color[4:6], 16)
        # ASS uses BGR format with alpha in front
        return f'&H00{b:02X}{g:02X}{r:02X}'
    
    return '&H00FFFFFF'  # Default to white if invalid

def process_text_with_options(text, style):
    """
    Procesează textul conform opțiunilor din style (ALL CAPS, eliminare punctuație).
    
    Args:
        text: Textul de procesat
        style: Dicționar cu opțiunile de stil
    
    Returns:
        str: Textul procesat
    """
    processed_text = text
    
    # Aplicăm ALL CAPS dacă este activat
    if style.get('allCaps', False):
        processed_text = processed_text.upper()
    
    # Eliminăm semnele de punctuație dacă este selectat
    if style.get('removePunctuation', False):
        import re
        processed_text = re.sub(r'[.,\/#!$%\^&\*;:{}=\-_`~()]', '', processed_text)
        processed_text = re.sub(r'\s{2,}', ' ', processed_text)  # eliminăm spațiile multiple
    
    return processed_text

def format_ass_timestamp(seconds):
    """Convert seconds to ASS timestamp format (h:mm:ss.cc)."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    seconds_int = int(seconds % 60)
    centiseconds = int((seconds % 1) * 100)
    
    return f"{hours}:{minutes:02d}:{seconds_int:02d}.{centiseconds:02d}"

def create_ass_file_with_custom_position(srt_path, output_path, style, subtitles):
    """
    Creează un fișier ASS (Advanced SubStation Alpha) pentru subtitrări cu poziționare personalizată.
    
    Args:
        srt_path: Calea către fișierul SRT original
        output_path: Calea unde va fi salvat fișierul ASS generat
        style: Dicționar cu stilul subtitrărilor
        subtitles: Lista de subtitrări formatate
    
    Returns:
        str: Calea către fișierul ASS generat
    """
    custom_x = style.get('customX', 50)
    custom_y = style.get('customY', 90)
    
    # Calculăm coordonatele în funcție de procentajele date
    x_pos = custom_x / 100  # Transformăm procentajul în valoare între 0-1
    y_pos = custom_y / 100  # Transformăm procentajul în valoare între 0-1
    
    # Creăm un header pentru fișierul ASS
    ass_header = """[Script Info]
ScriptType: v4.00+
PlayResX: 1280
PlayResY: 720
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_family},{font_size},&H{primary_color},&H{secondary_color},&H{outline_color},&H{back_color},0,0,0,0,100,100,0,0,1,{outline_width},0,2,10,10,10,1
Style: CurrentWord,{font_family},{font_size},&H{current_word_color},&H{secondary_color},&H{current_word_border_color},&H{back_color},1,0,0,0,100,100,0,0,1,{outline_width},0,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    
    # Extragem parametrii de stil
    font_family = style.get('fontFamily', 'Sans')
    font_size = style.get('fontSize', 24)
    font_color = hex_to_ass_color(style.get('fontColor', '#FFFFFF'))
    outline_color = hex_to_ass_color(style.get('borderColor', '#000000'))
    outline_width = style.get('borderWidth', 2)
    
    # Extragem culorile pentru cuvântul curent
    current_word_color = hex_to_ass_color(style.get('currentWordColor', '#FFFF00'))
    current_word_border_color = hex_to_ass_color(style.get('currentWordBorderColor', '#000000'))
    
    # Completăm header-ul cu informațiile de stil
    ass_header = ass_header.format(
        font_family=font_family,
        font_size=font_size,
        primary_color=font_color[2:],  # Eliminăm &H din început
        secondary_color="FFFFFF",
        outline_color=outline_color[2:],
        current_word_color=current_word_color[2:],
        current_word_border_color=current_word_border_color[2:],
        back_color="000000",
        outline_width=outline_width
    )
    
    # Creăm fișierul ASS
    with open(output_path, 'w', encoding='utf-8') as ass_file:
        ass_file.write(ass_header)
        
        # Adăugăm evenimentele de dialog pentru fiecare subtitrare
        for sub in subtitles:
            start_time = format_ass_timestamp(sub['start'])
            end_time = format_ass_timestamp(sub['end'])
            
            # Procesează textul conform opțiunilor din style
            text = process_text_with_options(sub['text'].strip(), style)
            text = text.replace('\n', '\\N')
            
            # Adăugăm poziția personalizată ca tag override
            position_tag = f"{{\\pos({x_pos * 1280},{y_pos * 720})}}"
            
            # Scriem linia de dialog
            dialog_line = f"Dialogue: 0,{start_time},{end_time},Default,,0,0,0,,{position_tag}{text}\n"
            ass_file.write(dialog_line)
    
    return output_path