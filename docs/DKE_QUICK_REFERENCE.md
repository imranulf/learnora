# Quick Reference Card: DKE + Content Discovery Integration

## 🚀 Quick Start (30 seconds)

```powershell
# Setup
cd c:\Users\imran\Dynamic_Knowledge_Evaluation
.\setup_integration.ps1

# Run demo
python dke_content_integration.py
```

## 📋 File Purpose Guide

| File | Use When... |
|------|------------|
| `dke.py` | Understanding DKE assessment system |
| `dke_content_integration.py` | Main integration code (import from here) |
| `example_custom_usage.py` | Building your own implementation |
| `README.md` | Getting started, quick overview |
| `INTEGRATION_GUIDE.md` | Deep dive, customization, troubleshooting |
| `CHECKLIST.md` | Verifying setup, deployment planning |
| `SUMMARY.md` | Architecture overview, quick reference |
| `setup_integration.ps1` | Automated setup & verification |

## 🎯 Core API

### Main Pipeline
```python
from dke_content_integration import AdaptiveLearningPipeline

pipeline = AdaptiveLearningPipeline(dke_pipeline=dke)

bundle = pipeline.run_assessment_and_recommend(
    user_id, response_text, reference_text,
    self_assess, concept_edges, required_edges,
    oracle, user_profile, context
)
```

### Result Bundle
```python
bundle.assessment_summary['theta']        # Ability estimate
bundle.assessment_summary['mastery_scores']  # Per-skill mastery
bundle.learning_gaps                      # List of LearningGap objects
bundle.recommended_content                # Personalized content list
bundle.learning_path                      # Ordered content IDs
bundle.estimated_completion_time          # Total minutes
```

## 🔧 Common Customizations

### Change Difficulty Mapping
```python
class MyAdapter(DKEContentAdapter):
    @staticmethod
    def map_mastery_to_difficulty(mastery):
        if mastery < 0.3: return "basic"
        if mastery < 0.6: return "intermediate"
        return "advanced"

pipeline = AdaptiveLearningPipeline(adapter=MyAdapter())
```

### Add Your Content
```python
from Project import LearningContent

my_content = [LearningContent(id=..., title=..., ...)]
pipeline.discovery.vector_db.add_contents(my_content)
```

### Adjust Search Strategy
```python
results = pipeline.discovery.discover_and_personalize(
    query, profile, strategy="bm25", top_k=10
)
# Options: "bm25", "dense", "hybrid"
```

## 📊 Key Data Structures

### LearningGap
```python
@dataclass
class LearningGap:
    skill: str                    # "algebra"
    mastery_level: float          # 0.0 to 1.0
    priority: str                 # "high", "medium", "low"
    recommended_difficulty: str   # "beginner", etc.
    estimated_study_time: int     # minutes
    rationale: str                # explanation
```

### UserProfile
```python
@dataclass
class UserProfile:
    user_id: str
    knowledge_areas: Dict[str, str]      # {"algebra": "beginner"}
    learning_goals: List[str]
    preferred_formats: List[str]          # ["video", "article"]
    available_time_daily: int             # minutes
    learning_style: str                   # "visual", etc.
```

## 🎓 Assessment Parameters

### DKE Pipeline Config
```python
DKEPipeline(
    bank=item_bank,
    cat_cfg=CATConfig(
        max_items=10,      # Max adaptive questions
        se_stop=0.35,      # Stop when SE < this
        start_theta=0.0    # Starting ability
    ),
    skills=["skill1", "skill2"],
    bkt_params=BKTParams(
        p_init=0.25,       # Initial mastery
        p_transit=0.20,    # Learning rate
        p_slip=0.10,       # Slip probability
        p_guess=0.20       # Guess probability
    )
)
```

## 🔍 Difficulty Thresholds

| Mastery Level | Difficulty | Priority |
|--------------|------------|----------|
| < 0.4 | Beginner | High |
| 0.4 - 0.7 | Intermediate | Medium |
| > 0.7 | Advanced | Low |

## ⏱️ Performance Benchmarks

| Operation | Time | Memory |
|-----------|------|--------|
| Assessment (10 items) | ~1 sec | ~10 MB |
| Content search | ~0.1 sec | ~50 MB |
| Full pipeline | ~2 sec | ~100 MB |

## 🐛 Quick Troubleshooting

| Error | Fix |
|-------|-----|
| `ImportError: Project` | Clone content-discovery-system; check PYTHONPATH |
| Empty recommendations | Add content: `add_contents(...)` |
| Poor matches | Try different strategy or add more content |
| Wrong difficulties | Adjust `map_mastery_to_difficulty()` |

## 📐 Key Formulas

### IRT 2PL
```
P(correct) = 1 / (1 + exp(-a(θ - b)))
```

### BKT Update
```
P(known|correct) = P(correct|known) × P(known) / P(correct)
P(next) = P(known|resp) + (1 - P(known|resp)) × p_transit
```

### Hybrid Search
```
Score = (1 - w) × BM25 + w × TF-IDF
Default: w = 0.65
```

## 🎨 Example Workflow

```python
# 1. Setup
bank, skills = create_item_bank()
dke = DKEPipeline(bank, cat_cfg, skills, bkt_params)
pipeline = AdaptiveLearningPipeline(dke_pipeline=dke)
pipeline.discovery.vector_db.add_contents(my_content)

# 2. Assess
bundle = pipeline.run_assessment_and_recommend(...)

# 3. Use Results
for gap in bundle.learning_gaps:
    print(f"{gap.skill}: {gap.mastery_level:.1%}")

for content in bundle.recommended_content:
    print(f"Study: {content['title']}")

# 4. Track Progress
progress = pipeline.update_after_learning(
    user_id, completed_ids, time_spent, oracle
)

# 5. Re-assess
# (repeat step 2 after learning)
```

## 📞 Getting Help

1. **Setup issues**: Run `setup_integration.ps1`
2. **Usage questions**: Check `README.md`
3. **Deep dive**: Read `INTEGRATION_GUIDE.md`
4. **Examples**: See `example_custom_usage.py`
5. **Testing**: Follow `CHECKLIST.md`

## 🔗 Important Links

- Content Discovery: https://github.com/imranulf/content-discovery-system
- Local files: `c:\Users\imran\Dynamic_Knowledge_Evaluation\`

## 💡 Pro Tips

1. **Start with demo**: Run `dke_content_integration.py` first
2. **Use example template**: Copy `example_custom_usage.py` for your code
3. **Test incrementally**: Small content library → full library
4. **Cache is automatic**: Second query with same params = instant
5. **Monitor mastery**: Track improvement over time

## 🎯 Success Metrics

**Technical**: All imports work, demo runs, results complete  
**Functional**: Gaps identified, content matches, path logical  
**Quality**: Time realistic, priorities aligned, relevance high

## ✅ Deployment Checklist

- [ ] Setup script passes
- [ ] Demo runs successfully
- [ ] Custom content added
- [ ] Parameters tuned
- [ ] User profiles integrated
- [ ] Testing completed
- [ ] Monitoring configured
- [ ] Documentation updated

## 📊 Typical Output

```
📊 ASSESSMENT SUMMARY
   Ability: 0.156 (SE: 0.312)
   
📉 MASTERY
   algebra: 37.4%
   probability: 55.8%
   
🎯 GAPS
   1. algebra (HIGH) - 60 min
   2. probability (MEDIUM) - 45 min
   
📚 RECOMMENDED
   1. Algebra Basics (beginner, 45 min)
   2. Probability Intro (intermediate, 40 min)
   
🛤️ PATH
   algebra-basics → probability-intro
   
⏱️ TOTAL: 105 minutes
```

---

**Version**: 1.0 | **Last Updated**: October 2025  
**Status**: ✅ Ready for use

**Quick Commands**:
```powershell
.\setup_integration.ps1           # Verify setup
python dke_content_integration.py # Run demo
python example_custom_usage.py    # Run custom example
```

**Need Help?** Check documentation files or review inline code comments.
