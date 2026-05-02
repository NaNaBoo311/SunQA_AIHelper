import os
import datetime
from pypdf import PdfReader
try:
    import docx
except ImportError:
    docx = None

class MarkdownConverter:
    @staticmethod
    def _generate_header(filename: str, filetype: str) -> str:
        timestamp = datetime.datetime.now(datetime.UTC).isoformat()
        return f"<!-- source: {filename}, type: {filetype}, uploaded: {timestamp} -->\n\n"

    @classmethod
    def convert_pdf_to_markdown(cls, file_path: str, filename: str) -> str:
        md_text = ""
        try:
            import pdfplumber
            import re
            content = []
            
            def process_text(text):
                if not text: return
                for line in text.split('\n'):
                    line = line.strip()
                    if not line:
                        continue
                    
                    is_heading = False
                    if len(line) < 100:
                        if line.isupper() and len(line) > 3:
                            is_heading = True
                        elif line.endswith(':'):
                            is_heading = True
                        elif bool(re.match(r'^(\d+(?:\.\d+)*\.?|[A-Z]\.|[IVXLCDM]+\.)\s+[A-Z]', line)):
                            if not line.endswith('.'):
                                is_heading = True
                                
                    if is_heading:
                        content.append(f"\n## {line}\n")
                    else:
                        content.append(line)

            def process_table(table_data):
                if not table_data: return
                content.append("\n")
                for i, row in enumerate(table_data):
                    row_data = [str(cell).strip().replace('\n', '<br>') if cell else "" for cell in row]
                    content.append("| " + " | ".join(row_data) + " |")
                    if i == 0:
                        content.append("|" + "|".join(["---"] * len(row)) + "|")
                content.append("\n")

            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    tables = page.find_tables()
                    tables.sort(key=lambda t: t.bbox[1]) # Sort vertically by top coordinate
                    
                    current_top = 0
                    for table in tables:
                        # Extract text above the table
                        if table.bbox[1] > current_top:
                            crop_box = (0, current_top, page.width, table.bbox[1])
                            cropped_page = page.crop(crop_box)
                            # Lower x_tolerance splits words more eagerly, preventing them from sticking together
                            text = cropped_page.extract_text(x_tolerance=1.5, y_tolerance=3)
                            process_text(text)
                            
                        # Process the table itself
                        process_table(table.extract())
                        
                        # Update current_top to the bottom of the table
                        current_top = table.bbox[3]
                        
                    # Extract any remaining text after the last table
                    if current_top < page.height:
                        crop_box = (0, current_top, page.width, page.height)
                        cropped_page = page.crop(crop_box)
                        text = cropped_page.extract_text(x_tolerance=1.5, y_tolerance=3)
                        process_text(text)
                        
                    content.append("\n---") # Page break
                            
            md_text = "\n".join(content)
        except Exception as e:
            try:
                # Absolute fallback using MarkItDown
                from markitdown import MarkItDown
                md = MarkItDown()
                md_text = md.convert(file_path).text_content
            except Exception as e2:
                raise Exception(f"Failed to convert PDF. Primary error: {e}. Fallback error: {e2}")
            
        header = cls._generate_header(filename, "pdf")
        return header + md_text

    @classmethod
    def convert_txt_to_markdown(cls, file_path: str, filename: str) -> str:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError:
            with open(file_path, 'r', encoding='latin-1') as f:
                content = f.read()
                
        header = cls._generate_header(filename, "txt")
        return header + content

    @classmethod
    def convert_md_to_markdown(cls, file_path: str, filename: str) -> str:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError:
            with open(file_path, 'r', encoding='latin-1') as f:
                content = f.read()
                
        header = cls._generate_header(filename, "md")
        return header + content
        
    @classmethod
    def convert_docx_to_markdown(cls, file_path: str, filename: str) -> str:
        if docx is None:
            raise Exception("python-docx is not installed")
        
        try:
            doc = docx.Document(file_path)
            content = []
            
            for child in doc.element.body.iterchildren():
                if child.tag.endswith('}p'):
                    para = docx.text.paragraph.Paragraph(child, doc)
                    text = para.text.strip()
                    if text:
                        if para.style.name.startswith('Heading'):
                            level = para.style.name.replace('Heading ', '')
                            try:
                                hashes = '#' * int(level)
                            except ValueError:
                                hashes = '##'
                            content.append(f"\n{hashes} {text}\n")
                        else:
                            content.append(text)
                elif child.tag.endswith('}tbl'):
                    table = docx.table.Table(child, doc)
                    content.append("")
                    for i, row in enumerate(table.rows):
                        row_data = [cell.text.strip().replace('\n', '<br>') for cell in row.cells]
                        content.append("| " + " | ".join(row_data) + " |")
                        if i == 0:
                            content.append("|" + "|".join(["---"] * len(row.cells)) + "|")
                    content.append("")
            
        except Exception as e:
            raise Exception(f"Failed to convert DOCX: {e}")
            
        header = cls._generate_header(filename, "docx")
        return header + "\n".join(content)

    @classmethod
    def convert(cls, file_path: str, filename: str) -> str:
        ext = os.path.splitext(filename)[1].lower()
        if ext == '.pdf':
            return cls.convert_pdf_to_markdown(file_path, filename)
        elif ext == '.txt':
            return cls.convert_txt_to_markdown(file_path, filename)
        elif ext == '.md':
            return cls.convert_md_to_markdown(file_path, filename)
        elif ext in {'.doc', '.docx'}:
            return cls.convert_docx_to_markdown(file_path, filename)
        else:
            raise Exception(f"Unsupported file extension: {ext}")
