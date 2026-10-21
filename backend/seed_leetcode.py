"""
LeetCode Problem Seeder for PyMastery Studio
Seeds standard LeetCode problems (Two Sum, Valid Parentheses, Binary Search,
Reverse Linked List, Best Time to Buy and Sell Stock, 3Sum, Longest Substring, etc.)
"""

from sqlalchemy.orm import Session
from .models import LeetCodeProblem
from .database import engine, Base


LEETCODE_PROBLEMS_DATA = [
    {
        "number": 1,
        "slug": "two-sum",
        "title": "Two Sum",
        "difficulty": "Easy",
        "category": "Arrays & Hashing",
        "time_complexity": "O(N)",
        "space_complexity": "O(N)",
        "description": """### Description
Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice. You can return the answer in any order.

### Example 1:
```
Input: nums = [2, 7, 11, 15], target = 9
Output: [0, 1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].
```

### Example 2:
```
Input: nums = [3, 2, 4], target = 6
Output: [1, 2]
```

### Constraints:
- `2 <= len(nums) <= 10^4`
- `-10^9 <= nums[i] <= 10^9`
- Only one valid answer exists.
""",
        "starter_code": """def two_sum(nums, target):
    # Hint: Use a hash map to store seen numbers and their indices
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []

# Test with live visualization:
res = two_sum([2, 7, 11, 15], 9)
print("Two Sum Result:", res)
""",
        "test_code": """assert sorted(two_sum([2, 7, 11, 15], 9)) == [0, 1], "Test 1 failed"
assert sorted(two_sum([3, 2, 4], 6)) == [1, 2], "Test 2 failed"
assert sorted(two_sum([3, 3], 6)) == [0, 1], "Test 3 failed"
""",
        "hints": "Can you solve it in a single pass using a hash map lookup in O(1) time?"
    },
    {
        "number": 20,
        "slug": "valid-parentheses",
        "title": "Valid Parentheses",
        "difficulty": "Easy",
        "category": "Stack",
        "time_complexity": "O(N)",
        "space_complexity": "O(N)",
        "description": """### Description
Given a string `s` containing just the characters `'('`, `')'`, `'{'`, `'}'`, `'['` and `']'`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

### Example 1:
```
Input: s = "()"
Output: True
```

### Example 2:
```
Input: s = "()[]{}"
Output: True
```

### Example 3:
```
Input: s = "(]"
Output: False
```
""",
        "starter_code": """def is_valid_parentheses(s: str) -> bool:
    stack = []
    mapping = {")": "(", "}": "{", "]": "["}
    
    for char in s:
        if char in mapping:
            top_element = stack.pop() if stack else '#'
            if mapping[char] != top_element:
                return False
        else:
            stack.append(char)
            
    return not stack

print("is_valid:", is_valid_parentheses("({[]})"))
""",
        "test_code": """assert is_valid_parentheses("()") is True, "Test 1 failed"
assert is_valid_parentheses("()[]{}") is True, "Test 2 failed"
assert is_valid_parentheses("(]") is False, "Test 3 failed"
assert is_valid_parentheses("([)]") is False, "Test 4 failed"
assert is_valid_parentheses("{[]}") is True, "Test 5 failed"
""",
        "hints": "Use a LIFO Stack to push opening brackets and pop matching pairs when closing brackets arrive."
    },
    {
        "number": 121,
        "slug": "best-time-to-buy-and-sell-stock",
        "title": "Best Time to Buy and Sell Stock",
        "difficulty": "Easy",
        "category": "Sliding Window",
        "time_complexity": "O(N)",
        "space_complexity": "O(1)",
        "description": """### Description
You are given an array `prices` where `prices[i]` is the price of a given stock on the $i$-th day.

You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.

Return the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return `0`.

### Example 1:
```
Input: prices = [7, 1, 5, 3, 6, 4]
Output: 5
Explanation: Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6 - 1 = 5.
```
""",
        "starter_code": """def max_profit(prices):
    min_price = float('inf')
    max_p = 0
    
    for price in prices:
        if price < min_price:
            min_price = price
        elif price - min_price > max_p:
            max_p = price - min_price
            
    return max_p

print("Max profit:", max_profit([7, 1, 5, 3, 6, 4]))
""",
        "test_code": """assert max_profit([7, 1, 5, 3, 6, 4]) == 5, "Test 1 failed"
assert max_profit([7, 6, 4, 3, 1]) == 0, "Test 2 failed"
assert max_profit([2, 4, 1]) == 2, "Test 3 failed"
""",
        "hints": "Keep track of the minimum price seen so far as you iterate through the list."
    },
    {
        "number": 704,
        "slug": "binary-search",
        "title": "Binary Search",
        "difficulty": "Easy",
        "category": "Binary Search",
        "time_complexity": "O(log N)",
        "space_complexity": "O(1)",
        "description": """### Description
Given an array of integers `nums` which is sorted in ascending order, and an integer `target`, write a function to search `target` in `nums`. If `target` exists, then return its index. Otherwise, return `-1`.

You must write an algorithm with $O(\\log n)$ runtime complexity.

### Example 1:
```
Input: nums = [-1, 0, 3, 5, 9, 12], target = 9
Output: 4
```
""",
        "starter_code": """def search(nums, target):
    left = 0
    right = len(nums) - 1
    
    while left <= right:
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
            
    return -1

print("Binary search index:", search([-1, 0, 3, 5, 9, 12], 9))
""",
        "test_code": """assert search([-1, 0, 3, 5, 9, 12], 9) == 4, "Test 1 failed"
assert search([-1, 0, 3, 5, 9, 12], 2) == -1, "Test 2 failed"
assert search([5], 5) == 0, "Test 3 failed"
""",
        "hints": "Calculate mid at each step and cut the search space in half."
    },
    {
        "number": 3,
        "slug": "longest-substring-without-repeating-characters",
        "title": "Longest Substring Without Repeating Characters",
        "difficulty": "Medium",
        "category": "Sliding Window",
        "time_complexity": "O(N)",
        "space_complexity": "O(min(M, N))",
        "description": """### Description
Given a string `s`, find the length of the **longest substring** without repeating characters.

### Example 1:
```
Input: s = "abcabcbb"
Output: 3
Explanation: The answer is "abc", with the length of 3.
```

### Example 2:
```
Input: s = "bbbbb"
Output: 1
```

### Example 3:
```
Input: s = "pwwkew"
Output: 3
Explanation: The answer is "wke", with the length of 3.
```
""",
        "starter_code": """def length_of_longest_substring(s: str) -> int:
    char_index_map = {}
    left = 0
    max_len = 0
    
    for right, char in enumerate(s):
        if char in char_index_map and char_index_map[char] >= left:
            left = char_index_map[char] + 1
        char_index_map[char] = right
        max_len = max(max_len, right - left + 1)
        
    return max_len

print("Longest substring len:", length_of_longest_substring("abcabcbb"))
""",
        "test_code": """assert length_of_longest_substring("abcabcbb") == 3, "Test 1 failed"
assert length_of_longest_substring("bbbbb") == 1, "Test 2 failed"
assert length_of_longest_substring("pwwkew") == 3, "Test 3 failed"
assert length_of_longest_substring("") == 0, "Test 4 failed"
""",
        "hints": "Maintain a dynamic sliding window [left, right] and update left whenever a duplicate is found."
    },
    {
        "number": 15,
        "slug": "3sum",
        "title": "3Sum",
        "difficulty": "Medium",
        "category": "Two Pointers",
        "time_complexity": "O(N^2)",
        "space_complexity": "O(1)",
        "description": """### Description
Given an integer array `nums`, return all the triplets `[nums[i], nums[j], nums[k]]` such that `i != j`, `i != k`, and `j != k`, and `nums[i] + nums[j] + nums[k] == 0`.

Notice that the solution set must not contain duplicate triplets.

### Example 1:
```
Input: nums = [-1, 0, 1, 2, -1, -4]
Output: [[-1, -1, 2], [-1, 0, 1]]
```
""",
        "starter_code": """def three_sum(nums):
    nums.sort()
    res = []
    
    for i in range(len(nums) - 2):
        if i > 0 and nums[i] == nums[i - 1]:
            continue
        left = i + 1
        right = len(nums) - 1
        while left < right:
            total = nums[i] + nums[left] + nums[right]
            if total == 0:
                res.append([nums[i], nums[left], nums[right]])
                while left < right and nums[left] == nums[left + 1]:
                    left += 1
                while left < right and nums[right] == nums[right - 1]:
                    right -= 1
                left += 1
                right -= 1
            elif total < 0:
                left += 1
            else:
                right -= 1
    return res

print("3Sum:", three_sum([-1, 0, 1, 2, -1, -4]))
""",
        "test_code": """res1 = three_sum([-1, 0, 1, 2, -1, -4])
assert len(res1) == 2, f"Expected 2 triplets, got {res1}"
assert [-1, -1, 2] in res1 and [-1, 0, 1] in res1, "Triplets mismatch"
assert three_sum([0, 1, 1]) == [], "No triplets sum to 0"
""",
        "hints": "Sort the array first, fix one element, and use two pointers (left and right) for the remaining pair."
    },
    {
        "number": 53,
        "slug": "maximum-subarray",
        "title": "Maximum Subarray (Kadane's Algorithm)",
        "difficulty": "Medium",
        "category": "Dynamic Programming",
        "time_complexity": "O(N)",
        "space_complexity": "O(1)",
        "description": """### Description
Given an integer array `nums`, find the subarray with the largest sum, and return its sum.

### Example 1:
```
Input: nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]
Output: 6
Explanation: The subarray [4, -1, 2, 1] has the largest sum 6.
```
""",
        "starter_code": """def max_sub_array(nums):
    current_sum = nums[0]
    max_sum = nums[0]
    
    for x in nums[1:]:
        current_sum = max(x, current_sum + x)
        max_sum = max(max_sum, current_sum)
        
    return max_sum

print("Max subarray sum:", max_sub_array([-2, 1, -3, 4, -1, 2, 1, -5, 4]))
""",
        "test_code": """assert max_sub_array([-2, 1, -3, 4, -1, 2, 1, -5, 4]) == 6, "Test 1 failed"
assert max_sub_array([1]) == 1, "Test 2 failed"
assert max_sub_array([5, 4, -1, 7, 8]) == 23, "Test 3 failed"
""",
        "hints": "Kadane's algorithm: at each position decide whether to start a new subarray or extend the previous one."
    }
]


def seed_leetcode(db: Session):
    Base.metadata.create_all(bind=engine)
    existing_count = db.query(LeetCodeProblem).count()
    if existing_count >= len(LEETCODE_PROBLEMS_DATA):
        return

    print("Seeding LeetCode problems into SQLite...")
    for idx, p in enumerate(LEETCODE_PROBLEMS_DATA):
        existing = db.query(LeetCodeProblem).filter(LeetCodeProblem.slug == p["slug"]).first()
        if not existing:
            prob = LeetCodeProblem(
                number=p["number"],
                slug=p["slug"],
                title=p["title"],
                difficulty=p["difficulty"],
                category=p["category"],
                description=p["description"],
                starter_code=p["starter_code"],
                test_code=p["test_code"],
                time_complexity=p["time_complexity"],
                space_complexity=p["space_complexity"],
                hints=p["hints"],
                order_index=idx
            )
            db.add(prob)
    db.commit()
    print(f"Successfully seeded {len(LEETCODE_PROBLEMS_DATA)} LeetCode problems!")


if __name__ == "__main__":
    from .database import SessionLocal
    db = SessionLocal()
    try:
        seed_leetcode(db)
    finally:
        db.close()
