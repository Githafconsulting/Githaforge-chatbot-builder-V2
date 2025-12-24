"""
Seed script to create sample blog categories and blog posts
Run this script to populate the database with sample data
Usage: python -m scripts.seed_blogs
"""

import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta
from app.core.database import get_supabase_client


def seed_categories():
    """Create default blog categories."""
    client = get_supabase_client()

    categories = [
        {
            "name": "AI & Chatbots",
            "slug": "ai-chatbots",
            "description": "Articles about AI technology and chatbot development",
            "color": "#a855f7"
        },
        {
            "name": "Product Updates",
            "slug": "product-updates",
            "description": "Latest features and improvements to Githaforge",
            "color": "#3b82f6"
        },
        {
            "name": "Tutorials",
            "slug": "tutorials",
            "description": "Step-by-step guides and how-to articles",
            "color": "#22c55e"
        },
        {
            "name": "Case Studies",
            "slug": "case-studies",
            "description": "Success stories from our customers",
            "color": "#f59e0b"
        },
        {
            "name": "Industry News",
            "slug": "industry-news",
            "description": "Latest trends and news in the AI industry",
            "color": "#ec4899"
        }
    ]

    print("Creating blog categories...")
    created_categories = {}

    for cat in categories:
        try:
            # Check if category exists
            existing = client.table("blog_categories").select("*").eq("slug", cat["slug"]).execute()

            if existing.data:
                print(f"  Category '{cat['name']}' already exists")
                created_categories[cat["slug"]] = existing.data[0]["id"]
            else:
                result = client.table("blog_categories").insert(cat).execute()
                created_categories[cat["slug"]] = result.data[0]["id"]
                print(f"  Created category: {cat['name']}")
        except Exception as e:
            print(f"  Error creating category {cat['name']}: {e}")

    return created_categories


def seed_blogs(categories: dict):
    """Create sample blog posts."""
    client = get_supabase_client()

    now = datetime.utcnow()

    blogs = [
        {
            "title": "Getting Started with AI Chatbots: A Complete Guide",
            "slug": "getting-started-ai-chatbots-complete-guide",
            "excerpt": "Learn how to build and deploy your first AI-powered chatbot with Githaforge. This comprehensive guide covers everything from setup to optimization.",
            "featured_image_url": "https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=1200&h=630&fit=crop",
            "featured_image_alt": "AI chatbot illustration with digital brain concept",
            "content": """# Getting Started with AI Chatbots

Artificial Intelligence has revolutionized the way businesses interact with their customers. In this guide, we'll walk you through everything you need to know about building your first AI chatbot.

## Why AI Chatbots?

AI chatbots offer numerous benefits:

- **24/7 Availability**: Your customers can get help anytime
- **Instant Responses**: No more waiting in queue
- **Scalability**: Handle thousands of conversations simultaneously
- **Cost Effective**: Reduce support costs by up to 30%

## Setting Up Your First Chatbot

### Step 1: Define Your Goals

Before diving into the technical setup, clearly define what you want your chatbot to achieve. Common goals include:

- Customer support automation
- Lead generation
- FAQ handling
- Appointment scheduling

### Step 2: Build Your Knowledge Base

Your chatbot is only as good as the information it has access to. Upload relevant documents, FAQs, and product information to create a comprehensive knowledge base.

### Step 3: Train and Test

Use real customer queries to test your chatbot's responses. Iterate and improve based on feedback.

## Best Practices

1. **Keep responses concise** - Users prefer short, actionable answers
2. **Use natural language** - Avoid robotic responses
3. **Provide escalation paths** - Let users reach a human when needed
4. **Monitor and improve** - Regularly review conversation logs

## Conclusion

Building an AI chatbot doesn't have to be complicated. With Githaforge, you can have a fully functional chatbot up and running in minutes. Start your free trial today and experience the future of customer service.""",
            "category_id": categories.get("tutorials"),
            "tags": ["chatbots", "ai", "getting-started", "tutorial", "beginner"],
            "author_name": "Githaforge Team",
            "status": "published",
            "published_at": (now - timedelta(days=2)).isoformat(),
            "is_featured": True,
            "read_time_minutes": 8,
            "meta_title": "Getting Started with AI Chatbots | Githaforge Blog",
            "meta_description": "Learn how to build and deploy your first AI-powered chatbot with our comprehensive guide. From setup to optimization, we cover it all.",
            "featured_image_url": "https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=1200&h=630&fit=crop",
            "featured_image_alt": "AI chatbot illustration"
        },
        {
            "title": "Top 10 Ways AI is Transforming Customer Service in 2025",
            "slug": "top-10-ways-ai-transforming-customer-service-2025",
            "excerpt": "Discover how artificial intelligence is reshaping customer service and what it means for your business in 2025.",
            "featured_image_url": "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&h=630&fit=crop",
            "featured_image_alt": "Robot hand reaching towards human representing AI customer service",
            "content": """# Top 10 Ways AI is Transforming Customer Service

The customer service landscape is undergoing a dramatic transformation, thanks to advances in artificial intelligence. Here are the top 10 ways AI is changing the game in 2025.

## 1. Intelligent Chatbots

Modern AI chatbots can understand context, sentiment, and intent, providing human-like interactions 24/7. Unlike rule-based bots of the past, today's AI chatbots learn and improve from every conversation.

## 2. Predictive Analytics

AI can predict customer issues before they occur, enabling proactive support. By analyzing patterns in customer behavior, businesses can address problems before they escalate.

## 3. Personalized Experiences

Machine learning algorithms analyze customer data to deliver tailored experiences. Every interaction is customized based on the customer's history, preferences, and behavior.

## 4. Voice Assistants

Voice-enabled AI is making customer service more accessible than ever. Customers can now resolve issues through natural conversation, just like talking to a human agent.

## 5. Automated Ticket Routing

AI intelligently routes support tickets to the right agent based on expertise, availability, and historical performance. This reduces resolution time and improves customer satisfaction.

## 6. Sentiment Analysis

Real-time sentiment analysis helps agents understand customer emotions during interactions. This enables more empathetic and effective responses.

## 7. Knowledge Base Optimization

AI continuously improves knowledge bases by identifying gaps, updating outdated content, and suggesting new articles based on customer queries.

## 8. Multi-language Support

AI-powered translation enables businesses to provide seamless support in dozens of languages without hiring multilingual agents.

## 9. Quality Assurance

Automated QA systems analyze 100% of customer interactions, ensuring consistent service quality and identifying training opportunities.

## 10. Self-Service Portals

Intelligent self-service options powered by AI reduce support load while improving customer satisfaction. Customers can find answers instantly without waiting for an agent.

## The Future is Now

Businesses that embrace AI in customer service are seeing significant improvements in efficiency, cost reduction, and customer satisfaction. The question isn't whether to adopt AI—it's how quickly you can implement it.

Ready to transform your customer service with AI? [Get started with Githaforge today](/signup).""",
            "category_id": categories.get("industry-news"),
            "tags": ["ai", "customer-service", "trends", "2025", "automation"],
            "author_name": "Githaforge Team",
            "status": "published",
            "published_at": (now - timedelta(days=5)).isoformat(),
            "is_featured": True,
            "read_time_minutes": 6,
            "meta_title": "Top 10 Ways AI is Transforming Customer Service | Githaforge",
            "meta_description": "Explore how AI is revolutionizing customer service in 2025. From intelligent chatbots to predictive analytics, discover the trends shaping the industry.",
            "featured_image_url": "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&h=630&fit=crop",
            "featured_image_alt": "AI and customer service concept"
        },
        {
            "title": "How TechCorp Reduced Support Costs by 40% with Githaforge",
            "slug": "techcorp-reduced-support-costs-40-percent-githaforge",
            "excerpt": "A detailed case study on how TechCorp implemented Githaforge chatbots and achieved remarkable results in just 6 months.",
            "featured_image_url": "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=630&fit=crop",
            "featured_image_alt": "Team celebrating success with analytics dashboard in background",
            "content": """# Case Study: TechCorp's Success with Githaforge

## Executive Summary

TechCorp, a rapidly growing B2B SaaS company with over 5,000 customers, was facing mounting challenges in their customer support operations. After implementing Githaforge's AI chatbot platform, they achieved a **40% reduction in support costs** while simultaneously improving customer satisfaction.

## The Challenge

Before Githaforge, TechCorp was struggling with:

- **High support ticket volume**: Over 2,000 tickets per month
- **Long response times**: Average first response time of 4 hours
- **Rising support costs**: Support team growing faster than revenue
- **Customer satisfaction declining**: CSAT scores dropped to 72%

Their small support team was overwhelmed, and hiring more agents wasn't a sustainable solution.

## The Solution

TechCorp implemented Githaforge's AI chatbot platform with the following approach:

### Phase 1: Knowledge Base Setup (Week 1-2)
- Uploaded 500+ support articles and FAQs
- Integrated with existing help documentation
- Trained the AI on common customer queries

### Phase 2: Chatbot Deployment (Week 3-4)
- Deployed chatbot on website and customer portal
- Set up intelligent routing to human agents for complex issues
- Implemented feedback collection system

### Phase 3: Optimization (Month 2-6)
- Continuously improved responses based on feedback
- Added new knowledge base content based on gaps identified by AI
- Fine-tuned escalation rules

## The Results

After 6 months of using Githaforge:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Support Costs | $150K/mo | $90K/mo | **40% reduction** |
| First Response Time | 4 hours | 30 seconds | **99% faster** |
| CSAT Score | 72% | 92% | **28% increase** |
| Tickets to Humans | 100% | 50% | **50% reduction** |
| 24/7 Availability | No | Yes | **Always on** |

## Key Takeaways

> "Githaforge transformed our customer support. Our team can now focus on complex issues while the AI handles routine queries efficiently. The ROI was evident within the first month."
>
> — Sarah Johnson, VP of Customer Success at TechCorp

### What Made the Difference

1. **Quick Implementation**: Up and running in just 2 weeks
2. **Easy Integration**: Seamless connection with existing tools
3. **Continuous Learning**: AI improved with every interaction
4. **Human Handoff**: Complex issues still reach human agents

## Ready to Transform Your Support?

Join hundreds of companies like TechCorp who have revolutionized their customer service with Githaforge.

[Start Your Free Trial](/signup) | [Book a Demo](/contact)""",
            "category_id": categories.get("case-studies"),
            "tags": ["case-study", "success-story", "roi", "customer-support", "saas"],
            "author_name": "Githaforge Team",
            "status": "published",
            "published_at": (now - timedelta(days=10)).isoformat(),
            "is_featured": False,
            "read_time_minutes": 5,
            "meta_title": "TechCorp Case Study: 40% Cost Reduction | Githaforge",
            "meta_description": "Learn how TechCorp reduced support costs by 40% and improved CSAT by 28% using Githaforge AI chatbots. Real results, real impact.",
            "featured_image_url": "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=630&fit=crop",
            "featured_image_alt": "Team collaboration and success"
        },
        {
            "title": "Introducing Multi-Language Support for Your Chatbots",
            "slug": "introducing-multi-language-support-chatbots",
            "excerpt": "We're excited to announce multi-language support, enabling your chatbots to communicate fluently in over 50 languages.",
            "featured_image_url": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=630&fit=crop",
            "featured_image_alt": "Digital globe showing global connectivity and languages",
            "content": """# Introducing Multi-Language Support

We're thrilled to announce a major new feature: **Multi-Language Support** for all Githaforge chatbots!

## What's New?

Your chatbots can now automatically detect and respond in your customers' preferred language. We support over 50 languages including:

- English
- Spanish (Español)
- French (Français)
- German (Deutsch)
- Arabic (العربية)
- Chinese (中文)
- Japanese (日本語)
- Portuguese (Português)
- Italian (Italiano)
- Dutch (Nederlands)
- And 40+ more!

## How It Works

### 1. Automatic Detection

Our AI automatically detects the language of incoming messages with 99% accuracy. No configuration required—it just works.

### 2. Seamless Translation

Responses are generated natively in the detected language, not just translated. This ensures natural, fluent communication that feels human.

### 3. Context Preservation

Meaning and context are preserved across languages. Technical terms, product names, and brand voice remain consistent.

### 4. RTL Support

Full support for right-to-left languages like Arabic and Hebrew, including proper text alignment and formatting.

## Use Cases

### Global Customer Support
Serve customers in their native language without hiring multilingual support staff.

### International E-commerce
Help shoppers from any country navigate your store and make purchases confidently.

### Multi-national Enterprises
Deploy a single chatbot that serves all your global offices and customers.

## Getting Started

Multi-language support is available on all **Pro** and **Enterprise** plans. To enable it:

1. Go to your chatbot settings
2. Navigate to **Language Settings**
3. Enable "Multi-Language Support"
4. Select your preferred languages (or enable all)
5. Save changes

That's it! Your chatbot will start responding in customers' languages immediately.

## Pricing

- **Pro Plan**: Up to 10 languages included
- **Enterprise Plan**: Unlimited languages

## What's Next?

We're continuing to improve our language capabilities:

- Voice support in multiple languages (coming Q2)
- Language-specific knowledge bases (coming Q3)
- Translation memory for consistency (coming Q4)

## Try It Today

Log in to your dashboard and start serving customers in their native language. Not a customer yet? [Start your free trial](/signup) and experience the power of multilingual AI chatbots.

---

Questions about multi-language support? [Contact our team](/contact) or check out our [documentation](/docs/languages).""",
            "category_id": categories.get("product-updates"),
            "tags": ["product-update", "multi-language", "feature", "announcement", "internationalization"],
            "author_name": "Githaforge Team",
            "status": "published",
            "published_at": (now - timedelta(days=1)).isoformat(),
            "is_featured": False,
            "read_time_minutes": 4,
            "meta_title": "Multi-Language Chatbot Support Now Available | Githaforge",
            "meta_description": "Githaforge chatbots now support 50+ languages with automatic detection and native-quality responses. Serve customers globally with AI.",
            "featured_image_url": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=630&fit=crop",
            "featured_image_alt": "Global communication and languages"
        }
    ]

    print("\nCreating sample blog posts...")

    for blog in blogs:
        try:
            # Check if blog exists
            existing = client.table("blogs").select("id").eq("slug", blog["slug"]).execute()

            if existing.data:
                print(f"  Blog '{blog['title'][:50]}...' already exists")
            else:
                result = client.table("blogs").insert(blog).execute()
                print(f"  Created blog: {blog['title'][:50]}...")
        except Exception as e:
            print(f"  Error creating blog '{blog['title'][:30]}...': {e}")


def main():
    """Main function to seed all blog data."""
    print("=" * 60)
    print("Seeding Blog Data for Githaforge")
    print("=" * 60)

    # First create categories
    categories = seed_categories()

    # Then create blogs with category references
    seed_blogs(categories)

    print("\n" + "=" * 60)
    print("Blog seeding complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
