-- Coding Interviews Migration
-- Adds support for live coding challenges during technical interviews

-- ===========================================
-- CODING CHALLENGES TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS coding_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty INTEGER NOT NULL DEFAULT 5 CHECK (difficulty >= 1 AND difficulty <= 10),
  category TEXT NOT NULL DEFAULT 'algorithms',
  languages TEXT[] NOT NULL DEFAULT ARRAY['javascript', 'python', 'typescript'],
  starter_code JSONB DEFAULT '{}',  -- { "javascript": "function solve(input) {\n  // Your code here\n}", ... }
  test_cases JSONB NOT NULL DEFAULT '[]',  -- [{ "input": "...", "expected": "...", "hidden": false }]
  hints TEXT[] DEFAULT ARRAY[]::TEXT[],
  time_limit_seconds INTEGER DEFAULT 1800,  -- 30 minutes default
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed some default challenges
INSERT INTO coding_challenges (title, description, difficulty, category, languages, starter_code, test_cases, hints) VALUES
(
  'Two Sum',
  E'Given an array of integers `nums` and an integer `target`, return the indices of the two numbers that add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\n**Example:**\n```\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]\nExplanation: nums[0] + nums[1] = 2 + 7 = 9\n```',
  3,
  'arrays',
  ARRAY['javascript', 'python', 'typescript'],
  '{"javascript": "function twoSum(nums, target) {\n  // Your code here\n}", "python": "def two_sum(nums, target):\n    # Your code here\n    pass", "typescript": "function twoSum(nums: number[], target: number): number[] {\n  // Your code here\n}"}',
  '[{"input": "[2,7,11,15], 9", "expected": "[0,1]", "hidden": false}, {"input": "[3,2,4], 6", "expected": "[1,2]", "hidden": false}, {"input": "[3,3], 6", "expected": "[0,1]", "hidden": true}]',
  ARRAY['Consider using a hash map to store values you''ve seen', 'For each number, check if (target - number) exists in your hash map', 'You can do this in O(n) time complexity']
),
(
  'Valid Parentheses',
  E'Given a string `s` containing just the characters ''('', '')'', ''{'', ''}'', ''['' and '']'', determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.\n\n**Example:**\n```\nInput: s = "()[]{}"\nOutput: true\n```',
  2,
  'stacks',
  ARRAY['javascript', 'python', 'typescript'],
  '{"javascript": "function isValid(s) {\n  // Your code here\n}", "python": "def is_valid(s):\n    # Your code here\n    pass", "typescript": "function isValid(s: string): boolean {\n  // Your code here\n}"}',
  '[{"input": "\"()\"", "expected": "true", "hidden": false}, {"input": "\"()[]{}\"", "expected": "true", "hidden": false}, {"input": "\"(]\"", "expected": "false", "hidden": false}, {"input": "\"([)]\"", "expected": "false", "hidden": true}]',
  ARRAY['Think about using a stack data structure', 'Push opening brackets onto the stack', 'When you see a closing bracket, check if it matches the top of the stack']
),
(
  'Reverse Linked List',
  E'Given the head of a singly linked list, reverse the list, and return the reversed list.\n\n**Example:**\n```\nInput: head = [1,2,3,4,5]\nOutput: [5,4,3,2,1]\n```\n\nThe ListNode class is provided:\n```\nclass ListNode {\n  val: number\n  next: ListNode | null\n}\n```',
  4,
  'linked_lists',
  ARRAY['javascript', 'python', 'typescript'],
  '{"javascript": "function reverseList(head) {\n  // Your code here\n}", "python": "def reverse_list(head):\n    # Your code here\n    pass", "typescript": "function reverseList(head: ListNode | null): ListNode | null {\n  // Your code here\n}"}',
  '[{"input": "[1,2,3,4,5]", "expected": "[5,4,3,2,1]", "hidden": false}, {"input": "[1,2]", "expected": "[2,1]", "hidden": false}, {"input": "[]", "expected": "[]", "hidden": true}]',
  ARRAY['You need to change the direction of each next pointer', 'Keep track of the previous node as you traverse', 'Consider both iterative and recursive approaches']
),
(
  'Binary Search',
  E'Given a sorted array of integers `nums` and a target value `target`, return the index of the target if it is in the array. If not, return -1.\n\nYou must write an algorithm with O(log n) runtime complexity.\n\n**Example:**\n```\nInput: nums = [-1,0,3,5,9,12], target = 9\nOutput: 4\n```',
  3,
  'searching',
  ARRAY['javascript', 'python', 'typescript'],
  '{"javascript": "function search(nums, target) {\n  // Your code here\n}", "python": "def search(nums, target):\n    # Your code here\n    pass", "typescript": "function search(nums: number[], target: number): number {\n  // Your code here\n}"}',
  '[{"input": "[-1,0,3,5,9,12], 9", "expected": "4", "hidden": false}, {"input": "[-1,0,3,5,9,12], 2", "expected": "-1", "hidden": false}, {"input": "[5], 5", "expected": "0", "hidden": true}]',
  ARRAY['Use two pointers: left and right', 'Calculate mid point and compare with target', 'Adjust pointers based on comparison']
),
(
  'Merge Two Sorted Lists',
  E'You are given the heads of two sorted linked lists `list1` and `list2`.\n\nMerge the two lists into one sorted list. The list should be made by splicing together the nodes of the first two lists.\n\nReturn the head of the merged linked list.\n\n**Example:**\n```\nInput: list1 = [1,2,4], list2 = [1,3,4]\nOutput: [1,1,2,3,4,4]\n```',
  4,
  'linked_lists',
  ARRAY['javascript', 'python', 'typescript'],
  '{"javascript": "function mergeTwoLists(list1, list2) {\n  // Your code here\n}", "python": "def merge_two_lists(list1, list2):\n    # Your code here\n    pass", "typescript": "function mergeTwoLists(list1: ListNode | null, list2: ListNode | null): ListNode | null {\n  // Your code here\n}"}',
  '[{"input": "[1,2,4], [1,3,4]", "expected": "[1,1,2,3,4,4]", "hidden": false}, {"input": "[], []", "expected": "[]", "hidden": false}, {"input": "[], [0]", "expected": "[0]", "hidden": true}]',
  ARRAY['Consider using a dummy head node to simplify the logic', 'Compare values and advance the appropriate pointer', 'Don''t forget to handle remaining nodes when one list is exhausted']
);

-- ===========================================
-- CODE SUBMISSIONS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS code_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES coding_challenges(id) ON DELETE SET NULL,
  language TEXT NOT NULL,
  code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted',  -- submitted, running, passed, failed, error
  test_results JSONB DEFAULT '[]',  -- [{ "passed": true, "input": "...", "expected": "...", "actual": "...", "time_ms": 10 }]
  execution_time_ms INTEGER,
  hints_used INTEGER DEFAULT 0,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_code_submissions_session ON code_submissions(session_id);
CREATE INDEX idx_code_submissions_challenge ON code_submissions(challenge_id);

-- ===========================================
-- ADD CODING FIELDS TO SESSIONS
-- ===========================================
ALTER TABLE interview_sessions
ADD COLUMN IF NOT EXISTS challenge_id UUID REFERENCES coding_challenges(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS programming_language TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS coding_time_limit_seconds INTEGER DEFAULT NULL;

-- ===========================================
-- RLS POLICIES
-- ===========================================
ALTER TABLE coding_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone can read challenges
CREATE POLICY "Anyone can view coding challenges"
  ON coding_challenges FOR SELECT
  USING (true);

-- Users can view their own submissions
CREATE POLICY "Users can view their code submissions"
  ON code_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM interview_sessions
      WHERE interview_sessions.id = code_submissions.session_id
      AND interview_sessions.user_id = auth.uid()
    )
  );

-- Users can insert submissions for their own sessions
CREATE POLICY "Users can insert code submissions"
  ON code_submissions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM interview_sessions
      WHERE interview_sessions.id = code_submissions.session_id
      AND interview_sessions.user_id = auth.uid()
    )
  );

-- Users can update their own submissions
CREATE POLICY "Users can update their code submissions"
  ON code_submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM interview_sessions
      WHERE interview_sessions.id = code_submissions.session_id
      AND interview_sessions.user_id = auth.uid()
    )
  );
