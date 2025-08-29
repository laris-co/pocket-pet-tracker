⏺ Here's how to create a GitHub issue with an inline body:

  gh issue create --title "Your Issue Title" --body "Your issue body content here.

  You can include multiple lines
  and formatting like **bold** or _italic_.

  - Bullet points work too
  - Like this

  Even code blocks:
  \`\`\`javascript
  console.log('hello');
  \`\`\`
  "

  For multi-line bodies, use a heredoc for better readability:

  gh issue create --title "Your Issue Title" --body "$(cat <<'EOF'
  ## Overview
  Description of the issue

  ## Steps to Reproduce
  1. First step
  2. Second step

  ## Expected Behavior
  What should happen

  ## Actual Behavior
  What actually happens

  ## Additional Context
  - Environment details
  - Screenshots if applicable
  EOF
  )"

  The heredoc approach (cat <<'EOF') is cleaner for complex issue bodies with formatting, lists, and code
   blocks.
