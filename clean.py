with open("superstore.csv", "r", encoding="utf-8", errors="ignore") as f:
    lines = f.readlines()
    
clean_lines = []
for line in lines:
    if line.strip() == "" or "Person,Region" in line or "Returned,Order ID" in line:
        break
    clean_lines.append(line)
    
with open("superstore_clean.csv", "w", encoding="utf-8") as f:
    f.writelines(clean_lines)
print(f"Shape after manual cleanup: {len(clean_lines)} rows")
