# SAT Vocabulary Level Framework

This document defines the vocabulary difficulty levels used in the SAT
reading analytics system.

The purpose of this framework is to: - estimate a student's vocabulary
familiarity level - identify vocabulary gaps based on words the student
marks as unfamiliar - generate feedback reports with representative
vocabulary examples

------------------------------------------------------------------------

# Vocabulary Level Scale (1--10)

  Level   Description
  ------- --------------------------------------------------
  1       Elementary vocabulary
  2       Basic everyday vocabulary
  3       Upper elementary / middle school vocabulary
  4       High school general vocabulary
  5       Advanced high school vocabulary
  6       Academic vocabulary (common in analytical texts)
  7       SAT core academic vocabulary
  8       Advanced academic vocabulary
  9       Rare academic vocabulary
  10      Very rare / specialized vocabulary

SAT Reading passages most frequently use **Level 6--8 vocabulary**.

------------------------------------------------------------------------

# Vocabulary Level Definitions and Examples

## Level 4 -- High School Vocabulary

Words commonly used in high school textbooks and general explanatory
writing.

Example words:

-   illustrate\
-   emphasize\
-   determine\
-   complex\
-   significant

------------------------------------------------------------------------

## Level 5 -- Advanced High School Vocabulary

Words frequently used in analytical writing and formal explanations.

Example words:

-   infer\
-   derive\
-   interpret\
-   evaluate\
-   attribute

------------------------------------------------------------------------

## Level 6 -- Academic Vocabulary

Common in academic discussions, research explanations, and analytical
texts.

Example words:

-   constitute\
-   constrain\
-   indicate\
-   assume\
-   factor

------------------------------------------------------------------------

## Level 7 -- SAT Core Academic Vocabulary

Frequently appearing in SAT Reading passages and academic arguments.

Example words:

-   mitigate\
-   consolidate\
-   reinforce\
-   justify\
-   assess

------------------------------------------------------------------------

## Level 8 -- Advanced Academic Vocabulary

Less common but still present in higher-level academic texts.

Example words:

-   delineate\
-   corroborate\
-   substantiate\
-   articulate\
-   reconcile

------------------------------------------------------------------------

## Level 9 -- Rare Academic Vocabulary

Occasionally found in complex literary or scholarly texts.

Example words:

-   desultory\
-   pellucid\
-   tenuous\
-   obscure\
-   intricate

------------------------------------------------------------------------

# Report Message Template

The system should generate vocabulary feedback based on the estimated
level gap.

Example template:

    Vocabulary Gap Analysis

    Based on the words you marked as unfamiliar,
    your vocabulary gap appears to lie around **Level {level}**.

    Level {level} vocabulary corresponds to:
    {level_description}

    Representative words at this level include:

    {example_words}

    Strengthening familiarity with vocabulary at this level can help improve
    your comprehension of SAT reading passages.

------------------------------------------------------------------------

# Example Output

Example when a student shows a Level 7 vocabulary gap.

    Vocabulary Gap Analysis

    Based on the words you marked as unfamiliar,
    your vocabulary gap appears to lie around **Level 7**.

    Level 7 vocabulary corresponds to SAT core academic vocabulary commonly used
    in argumentative and analytical SAT reading passages.

    Representative words at this level include:

    mitigate  
    consolidate  
    reinforce  
    justify  
    assess  

    Strengthening familiarity with vocabulary at this level can help improve
    your comprehension of SAT reading passages.

------------------------------------------------------------------------

# Implementation Notes

Recommended workflow:

1.  Tag SAT vocabulary with a **level (1--10)** in a database.
2.  Collect words marked as **unknown by the student**.
3.  Calculate the **median or average level** of those words.
4.  Identify the **dominant vocabulary level gap**.
5.  Generate a report using the message template above.
