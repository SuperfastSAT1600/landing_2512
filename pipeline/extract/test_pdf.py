import pymupdf4llm
import sys

def test_md(filename):
    md_text = pymupdf4llm.to_markdown(filename, pages=[0])
    print(md_text)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        test_md(sys.argv[1])
    else:
        print("Usage: python test_pdf.py <pdf_path>")
