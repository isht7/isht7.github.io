import pandas as pd
import numpy as np
import json
import sys
import os

def csv_to_clean_json(csv_path, output_json_path=None):
    # Load the CSV
    df = pd.read_csv(csv_path)

    # Replace NaN with None to make JSON valid
    df_cleaned = df.replace({np.nan: None})

    # Convert to list of dicts
    data_json = df_cleaned.to_dict(orient="records")

    # Auto-determine output filename if not provided
    if output_json_path is None:
        base = os.path.splitext(csv_path)[0]
        output_json_path = base + ".json"

    # Write to JSON
    with open(output_json_path, "w") as f:
        json.dump(data_json, f, indent=2)

    print(f"✅ JSON written to: {output_json_path}")

# Optional: run from command line
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python json_generator.py input_file.csv [output_file.json]")
    else:
        csv_path = sys.argv[1]
        output_path = sys.argv[2] if len(sys.argv) > 2 else None
        csv_to_clean_json(csv_path, output_path)

