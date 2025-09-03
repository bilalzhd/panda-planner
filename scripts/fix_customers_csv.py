#!/usr/bin/env python3
"""
Normalize a Shopify Customers CSV so every row has exactly 12 columns:

Columns:
0 First Name
1 Last Name
2 Email
3 Default Address Company
4 Default Address Address1
5 Default Address Address2
6 Default Address City
7 Default Address Province Code
8 Country
9 Zip
10 Default Address Phone
11 Phone

Strategy for problematic rows (too many/few values):
- Use 'GB' as an anchor for Country to reconstruct address fields.
- Everything between Address1 start and Province Code is split into
  Address1, Address2, City (last token becomes City; middle collapsed into Address2).
- If there are trailing extra tokens after Zip, map the first two to phones
  and ignore any further extras by joining into the last phone field.
- If fewer than 12, pad with empty strings.

This aims to robustly fix rows where commas in address/city were not
properly quoted and to remove accidental trailing empty columns.
"""

import csv
import sys
from pathlib import Path

EXPECTED_COLS = 12
HEADERS = [
    "First Name",
    "Last Name",
    "Email",
    "Default Address Company",
    "Default Address Address1",
    "Default Address Address2",
    "Default Address City",
    "Default Address Province Code",
    "Country",
    "Zip",
    "Default Address Phone",
    "Phone",
]


def normalize_row(row):
    # Trim surrounding whitespace on each cell
    row = [ (c or "").strip() for c in row ]

    # If already correct length, return as-is
    if len(row) == EXPECTED_COLS:
        return row

    # Base shape
    out = [""] * EXPECTED_COLS

    # Copy first four fields when available
    for i in range(4):
        if i < len(row):
            out[i] = row[i]

    # Find country anchor ('GB') preferably after index 4
    idx_country = -1
    for i, val in enumerate(row):
        if val == "GB" and i >= 5:  # typical position is after city/province
            idx_country = i
            break

    if idx_country == -1:
        # Fallback: try last occurrence of GB anywhere
        for i in range(len(row) - 1, -1, -1):
            if row[i] == "GB":
                idx_country = i
                break

    if idx_country != -1:
        # Province code is token immediately before country if possible
        prov = row[idx_country - 1] if idx_country - 1 >= 0 else ""
        out[7] = prov
        out[8] = "GB"

        # Left partition for Address1/2/City
        start_addr = 4
        end_addr_excl = max(4, idx_country - 1)  # exclude province
        left = row[start_addr:end_addr_excl]

        if len(left) >= 3:
            out[4] = left[0]
            out[6] = left[-1]
            out[5] = ", ".join([c for c in left[1:-1] if c])
        elif len(left) == 2:
            out[4] = left[0]
            out[5] = ""
            out[6] = left[1]
        elif len(left) == 1:
            out[4] = left[0]
            out[5] = ""
            out[6] = ""
        else:
            out[4] = out[5] = out[6] = ""

        # Right side: Zip and phones
        idx_zip = idx_country + 1
        out[9] = row[idx_zip] if idx_zip < len(row) else ""

        # Remaining tokens after Zip
        rest = row[idx_zip + 1 :] if idx_zip + 1 <= len(row) else []

        if rest:
            out[10] = rest[0]
        if len(rest) >= 2:
            out[11] = rest[1]
        if len(rest) > 2:
            # If more, join into last phone field to avoid losing data
            extra = ", ".join(rest[2:])
            out[11] = (out[11] + (", " if out[11] and extra else "") + extra).strip(", ")
    else:
        # No country anchor found. Best effort: trim/pad to fit.
        # Keep first 10 as-is and map last two to phones.
        base = row[:10]
        while len(base) < 10:
            base.append("")
        out[:10] = base
        phones = row[10:]
        if phones:
            out[10] = phones[0]
        if len(phones) >= 2:
            out[11] = phones[1]
        if len(phones) > 2:
            out[11] += (", " if out[11] else "") + ", ".join(phones[2:])

    # Final normalization: ensure exactly 12 columns
    out = (out + [""] * EXPECTED_COLS)[:EXPECTED_COLS]
    return out


def main():
    if len(sys.argv) < 3:
        print("Usage: fix_customers_csv.py <input.csv> <output.csv>")
        sys.exit(1)

    inp = Path(sys.argv[1])
    outp = Path(sys.argv[2])

    with inp.open("r", newline="", encoding="utf-8") as f_in, outp.open(
        "w", newline="", encoding="utf-8"
    ) as f_out:
        reader = csv.reader(f_in)
        writer = csv.writer(f_out)

        first = True
        for row in reader:
            # Skip completely empty lines
            if not any(cell.strip() for cell in row):
                continue

            if first:
                first = False
                # Write the expected header regardless of the input header shape
                writer.writerow(HEADERS)
                # If the first row appears to be a header, skip it; simple check
                lowered = [c.strip().lower() for c in row]
                if "first name" in lowered and "last name" in lowered and "email" in lowered:
                    continue

            fixed = normalize_row(row)
            writer.writerow(fixed)

    # Optional: quick verification printout
    with outp.open("r", newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        counts = []
        for i, row in enumerate(reader, start=1):
            counts.append((i, len(row)))
        bad = [f"row {i} -> {n} cols" for i, n in counts if n != EXPECTED_COLS]
        if bad:
            print("Warning: Non-12 column rows detected:")
            for b in bad:
                print("  ", b)
        else:
            print("OK: All rows have 12 columns.")


if __name__ == "__main__":
    main()

