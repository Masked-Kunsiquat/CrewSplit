import json
import glob
import os
import math
from typing import Any, Dict, List, Tuple


def _normalize_equal(count: int, total: int) -> List[int]:
    base = total // count
    remainder = total - base * count
    result = [base] * count
    for i in range(remainder):
        result[i] += 1
    return result


def _normalize_percentage(stable_splits: List[Dict[str, Any]], total: int) -> List[int]:
    total_percentage = sum(s["share"] for s in stable_splits)

    # Match app behavior: allow tiny floating point tolerance around 100.
    tolerance = 0.01 + (math.ulp(1.0) * 100)
    if abs(total_percentage - 100) > tolerance:
        raise ValueError(f"Percentages must sum to 100, got {total_percentage}")

    exact_amounts = [(s["share"] / 100) * total for s in stable_splits]
    base_amounts = [math.floor(a) for a in exact_amounts]
    base_total = sum(base_amounts)
    remainder = total - base_total

    fractional_parts = [
        {"index": i, "fraction": exact_amounts[i] - base_amounts[i]}
        for i in range(len(stable_splits))
    ]

    # Deterministic tie-break: stable ordering already sorted by participantId.
    fractional_parts.sort(
        key=lambda x: (-x["fraction"], x["index"])
    )

    result = list(base_amounts)
    for i in range(remainder):
        result[fractional_parts[i]["index"]] += 1

    return result


def _normalize_weight(stable_splits: List[Dict[str, Any]], total: int) -> List[int]:
    total_weight = sum(s["share"] for s in stable_splits)
    if total_weight <= 0:
        raise ValueError("Total weight must be positive")

    exact_amounts = [(s["share"] / total_weight) * total for s in stable_splits]
    base_amounts = [math.floor(a) for a in exact_amounts]
    base_total = sum(base_amounts)
    remainder = total - base_total

    fractional_parts = [
        {"index": i, "fraction": exact_amounts[i] - base_amounts[i]}
        for i in range(len(stable_splits))
    ]

    fractional_parts.sort(
        key=lambda x: (-x["fraction"], x["index"])
    )

    result = list(base_amounts)
    for i in range(remainder):
        result[fractional_parts[i]["index"]] += 1

    return result


def _normalize_amount(stable_splits: List[Dict[str, Any]], total: int) -> List[int]:
    missing_amounts = [s for s in stable_splits if s.get("amount") is None]
    if missing_amounts:
        raise ValueError(
            f"All splits must have explicit amounts; found {len(missing_amounts)} missing amount(s)"
        )

    amounts = [s["amount"] for s in stable_splits]
    sum_amounts = sum(amounts)
    if sum_amounts != total:
        raise ValueError(
            f"Split amounts must sum to expense total. Expected {total}, got {sum_amounts}"
        )
    return amounts


def normalize_shares(splits: List[Dict[str, Any]], expense_amount: int) -> List[int]:
    """
    Mirrors app normalization (src/modules/settlement/normalize-shares.ts):
    - Does not depend on caller split ordering.
    - For 'equal': divide, distribute remainder to first N in stable participantId order.
    - For 'percentage' / 'weight': floor each share then distribute remainder by largest fractional parts,
      tie-breaking deterministically by stable index.
    - For 'amount': validate explicit amounts sum exactly.
    """
    if not splits:
        return []

    if expense_amount == 0:
        return [0] * len(splits)

    share_type = splits[0]["shareType"]
    if not all(s["shareType"] == share_type for s in splits):
        raise ValueError("All splits for an expense must have the same shareType")

    # Stable ordering by participantId to avoid DB/JSON order affecting rounding.
    stable = sorted(
        [{"split": s, "originalIndex": i} for i, s in enumerate(splits)],
        key=lambda x: (x["split"]["participantId"], x["originalIndex"]),
    )

    stable_splits = [x["split"] for x in stable]

    if share_type == "equal":
        stable_normalized = _normalize_equal(len(stable_splits), expense_amount)
    elif share_type == "percentage":
        stable_normalized = _normalize_percentage(stable_splits, expense_amount)
    elif share_type == "weight":
        stable_normalized = _normalize_weight(stable_splits, expense_amount)
    elif share_type == "amount":
        stable_normalized = _normalize_amount(stable_splits, expense_amount)
    else:
        raise ValueError(f"Unknown share type: {share_type}")

    normalized = [0] * len(splits)
    for stable_index, amount in enumerate(stable_normalized):
        normalized[stable[stable_index]["originalIndex"]] = amount

    return normalized

def resolve_debts(balances, participants):
    """
    Calculates specific 'Who pays Whom' transactions to settle debts.
    Uses a greedy algorithm to minimize the number of transactions.
    """
    # Separate into Debtors (owes money) and Creditors (owed money)
    debtors = []
    creditors = []

    for p_id, amount in balances.items():
        if amount < 0:
            debtors.append({'id': p_id, 'amount': amount})
        elif amount > 0:
            creditors.append({'id': p_id, 'amount': amount})

    # Sort by magnitude (largest amounts first) to simplify transactions
    debtors.sort(key=lambda x: x['amount'])       # Ascending (most negative first)
    creditors.sort(key=lambda x: x['amount'], reverse=True) # Descending (most positive first)

    settlements = []

    # Two-pointer-like greedy approach
    d_idx = 0
    c_idx = 0

    while d_idx < len(debtors) and c_idx < len(creditors):
        debtor = debtors[d_idx]
        creditor = creditors[c_idx]

        # The amount to settle is the minimum of what the debtor owes 
        # vs what the creditor is owed.
        amount = min(abs(debtor['amount']), creditor['amount'])

        # Record the transaction
        from_name = participants.get(debtor['id'], "Unknown")
        to_name = participants.get(creditor['id'], "Unknown")
        
        settlements.append({
            'from': from_name,
            'to': to_name,
            'amount': amount
        })

        # Update remaining balances
        debtor['amount'] += amount
        creditor['amount'] -= amount

        # If fully settled, move to next person
        # Use a small epsilon for float safety, though we are using ints (cents)
        if abs(debtor['amount']) < 1:
            d_idx += 1
        if creditor['amount'] < 1:
            c_idx += 1

    return settlements

def verify_and_calculate_trip(file_path):
    print(f"\n{' PROCESSING FILE ':*^60}")
    print(f"File: {os.path.basename(file_path)}")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error reading file: {e}")
        return

    # 1. Map IDs to readable names
    participants = {p['id']: p['name'] for p in data.get('participants', [])}
    
    # Initialize balances
    balances = {p_id: 0 for p_id in participants}
    total_trip_cost = 0

    # 2. Process Expenses
    print(f"{'EXPENSE VERIFICATION':=^60}")
    print(f"{'Date':<12} | {'Description':<25} | {'Type':<10} | {'Status'}")
    print("-" * 60)

    for expense in data.get('expenses', []):
        exp_id = expense['id']
        amount = expense['amount']
        paid_by = expense['paidBy']
        desc = expense.get('description', 'Unknown')
        date_short = expense['date'][:10]
        
        total_trip_cost += amount

        splits = [s for s in data.get('expenseSplits', []) if s['expenseId'] == exp_id]
        
        calculated_split_total = 0
        split_details = []

        if not splits:
            continue

        share_type = splits[0]['shareType']

        # Calculate splits using the same deterministic normalization as the app.
        try:
            normalized_amounts = normalize_shares(splits, amount)
        except Exception as e:
            print(f"{date_short} | {desc:<25} | {share_type:<10} | ❌ ERROR: {e}")
            continue

        for i, split in enumerate(splits):
            this_share = normalized_amounts[i]
            calculated_split_total += this_share
            split_details.append((split['participantId'], this_share))

        # Verify Sum
        delta = amount - calculated_split_total
        is_valid = delta == 0
        status = "✅ OK" if is_valid else f"❌ DIFF: {delta}"
        print(f"{date_short} | {desc:<25} | {share_type:<10} | {status}")

        if is_valid:
            if paid_by in balances:
                balances[paid_by] += amount
            for p_id, share_amount in split_details:
                if p_id in balances:
                    balances[p_id] -= share_amount

    # 3. Final Report & Settlements
    print("-" * 60)
    print(f"Total Trip Cost: ${total_trip_cost/100:.2f}")
    
    print("\nSETTLEMENT PLAN (Who pays Whom)")
    print("=" * 60)
    
    # Run the settlement logic
    settlements = resolve_debts(balances, participants)
    
    if not settlements:
        print("All balances are settled! No payments needed.")
    else:
        for s in settlements:
            amt = s['amount'] / 100
            print(f"💸 {s['from']:<15} pays {s['to']:<15} ${amt:.2f}")
            
    print("=" * 60)
    print("\n")

# --- MAIN EXECUTION ---
if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    current_cwd = os.getcwd()

    patterns = [
        os.path.join(current_cwd, "crewledger-*.json"),
        os.path.join(script_dir, "crewledger-*.json")
    ]

    files = []
    for p in patterns:
        files.extend(glob.glob(p))
    
    unique_files = list(set(files))

    if not unique_files:
        print("No 'crewledger-*.json' files found.")
    else:
        for file_name in unique_files:
            verify_and_calculate_trip(file_name)
