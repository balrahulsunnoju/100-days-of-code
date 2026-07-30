# Step 1: Load and Validate Sprint Status

## EXECUTION SEQUENCE

### 1. Load Sprint Status File
- Read `{implementation_artifacts}/sprint-status.yaml`
- Parse YAML preserving comments

### 2. Find Story Entry
- Locate `development_status[{story_key}]`
- Handle both string and object formats

### 3. Validate Transition
Verify the status transition is valid:
- backlog → ready-for-dev
- ready-for-dev → in-progress
- in-progress → review
- review → done OR review → in-progress

### 4. Extract Current State
If story is already an object, preserve:
- story_file
- created
- started
- existing metrics
