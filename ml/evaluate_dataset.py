"""
FlowerCycle Dataset & Machine Learning Suitability Evaluation Script.
Evaluates:
1. Public open-source composting dataset (data/raw/compost_maturity_github.csv)
   using pandas and scikit-learn (LinearRegression & RandomForestRegressor).
2. Internal FlowerCycle conversion/cost/price reference datasets for ML readiness.
Outputs honest metrics and suitability verdict to data/processed/ml_evaluation_report.json.
"""

import json
import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import r2_score, mean_absolute_error, root_mean_squared_error

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_COMPOST_PATH = os.path.join(BASE_DIR, "data", "raw", "compost_maturity_github.csv")
FLOWER_REF_PATH = os.path.join(BASE_DIR, "data", "flower_waste_dataset.csv")
OUT_PATH = os.path.join(BASE_DIR, "data", "processed", "ml_evaluation_report.json")


def evaluate():
    df_compost = pd.read_csv(RAW_COMPOST_PATH)
    df_flowers = pd.read_csv(FLOWER_REF_PATH)

    # Evaluate Compost Maturity Prediction on real empirical sensor dataset
    feature_cols = ["Day", "Temperature", "MC(%)", "pH", "C/N Ratio", "TN(%)", "TOC(%)", "EC(ms/cm)"]
    target_col = "Score"

    clean_df = df_compost[feature_cols + [target_col]].dropna()
    X = clean_df[feature_cols]
    y = clean_df[target_col]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    lr = LinearRegression()
    lr.fit(X_train, y_train)
    lr_pred = lr.predict(X_test)

    rf = RandomForestRegressor(n_estimators=120, random_state=42)
    rf.fit(X_train, y_train)
    rf_pred = rf.predict(X_test)

    importances = {
        col: round(float(imp), 4)
        for col, imp in sorted(zip(feature_cols, rf.feature_importances_), key=lambda x: -x[1])
    }

    report = {
        "evaluatedAt": pd.Timestamp.now().isoformat(),
        "publicCompostDataset": {
            "source": "github.com/hafsa-kibria/Compost-Dataset (Compost Data.csv)",
            "rows": int(len(df_compost)),
            "columns": list(df_compost.columns),
            "targetEvaluated": "Compost Maturity Score (GI/physicochemical index)",
            "trainRows": int(len(X_train)),
            "testRows": int(len(X_test)),
            "models": {
                "LinearRegression": {
                    "r2": round(float(r2_score(y_test, lr_pred)), 4),
                    "mae": round(float(mean_absolute_error(y_test, lr_pred)), 4),
                    "rmse": round(float(root_mean_squared_error(y_test, lr_pred)), 4),
                },
                "RandomForestRegressor": {
                    "r2": round(float(r2_score(y_test, rf_pred)), 4),
                    "mae": round(float(mean_absolute_error(y_test, rf_pred)), 4),
                    "rmse": round(float(root_mean_squared_error(y_test, rf_pred)), 4),
                },
            },
            "featureImportances": importances,
            "limitation": (
                "Predicts compost maturity chemistry (Score) from lab sensors, "
                "not flower species dry-matter conversion, incense/gulal yield, or INR financial profit."
            ),
        },
        "financialYieldMLSuitability": {
            "isSuitableForProductionFinancialML": False,
            "referenceTableRows": int(len(df_flowers)),
            "recommendedProductionEngine": "Validated Rule-Based Conversion & P&L Engine",
            "reason": (
                "No public empirical dataset contains paired temple flower species, moisture condition, "
                "contamination %, processing method, finished product output (incense/compost/gulal/decor), "
                "and actual Indian INR costs/sales across >=100 real batches. Training ML on small rule-generated "
                "or synthetic rows would cause circular data leakage and misleading confidence."
            ),
            "futureMLArchitectureReady": (
                "FlowerCycle stores every verified batch in MongoDB (CalculationHistory + WasteRecord + "
                "FinancialTransaction). Once >=100 real verified processing batches are accumulated, "
                "ml/evaluate_dataset.py can be re-run to train scikit-learn yield & cost regressors."
            ),
        },
    }

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w") as f:
        json.dump(report, f, indent=2)

    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    evaluate()
