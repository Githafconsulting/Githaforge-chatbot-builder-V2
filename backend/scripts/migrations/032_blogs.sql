-- Migration: 032_blogs.sql
-- Description: Create blogs table for blog management system
-- Date: 2025-12-24

-- Create blog_categories table
CREATE TABLE IF NOT EXISTS blog_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#a855f7',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create blogs table
CREATE TABLE IF NOT EXISTS blogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Basic content
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    excerpt TEXT,
    content TEXT NOT NULL,

    -- Featured image
    featured_image_url TEXT,
    featured_image_alt VARCHAR(255),

    -- SEO fields
    meta_title VARCHAR(70),
    meta_description VARCHAR(160),
    meta_keywords TEXT[],
    canonical_url TEXT,

    -- Organization
    category_id UUID REFERENCES blog_categories(id) ON DELETE SET NULL,
    tags TEXT[] DEFAULT '{}',

    -- Author info
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    author_name VARCHAR(255),
    author_avatar_url TEXT,

    -- Publishing
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    published_at TIMESTAMP WITH TIME ZONE,

    -- Engagement
    view_count INTEGER DEFAULT 0,
    read_time_minutes INTEGER DEFAULT 5,

    -- Flags
    is_featured BOOLEAN DEFAULT FALSE,
    allow_comments BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_blogs_slug ON blogs(slug);
CREATE INDEX IF NOT EXISTS idx_blogs_status ON blogs(status);
CREATE INDEX IF NOT EXISTS idx_blogs_published_at ON blogs(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blogs_category_id ON blogs(category_id);
CREATE INDEX IF NOT EXISTS idx_blogs_is_featured ON blogs(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_blogs_tags ON blogs USING GIN(tags);

-- Insert default categories
INSERT INTO blog_categories (name, slug, description, color) VALUES
    ('AI & Chatbots', 'ai-chatbots', 'Articles about AI technology and chatbot development', '#a855f7'),
    ('Product Updates', 'product-updates', 'Latest features and improvements to Githaforge', '#3b82f6'),
    ('Tutorials', 'tutorials', 'Step-by-step guides and how-to articles', '#22c55e'),
    ('Case Studies', 'case-studies', 'Success stories from our customers', '#f59e0b'),
    ('Industry News', 'industry-news', 'Latest trends and news in the AI industry', '#ec4899')
ON CONFLICT (slug) DO NOTHING;

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_blogs_updated_at ON blogs;
CREATE TRIGGER update_blogs_updated_at
    BEFORE UPDATE ON blogs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_blog_categories_updated_at ON blog_categories;
CREATE TRIGGER update_blog_categories_updated_at
    BEFORE UPDATE ON blog_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Sample blog posts for testing
INSERT INTO blogs (
    title,
    slug,
    excerpt,
    content,
    featured_image_url,
    featured_image_alt,
    category_id,
    tags,
    author_name,
    status,
    published_at,
    is_featured,
    read_time_minutes,
    meta_title,
    meta_description
) VALUES
(
    'Getting Started with AI Chatbots: A Complete Guide',
    'getting-started-ai-chatbots-complete-guide',
    'Learn how to build and deploy your first AI-powered chatbot with Githaforge. This comprehensive guide covers everything from setup to optimization.',
    E'# Getting Started with AI Chatbots\n\nArtificial Intelligence has revolutionized the way businesses interact with their customers. In this guide, we''ll walk you through everything you need to know about building your first AI chatbot.\n\n## Why AI Chatbots?\n\nAI chatbots offer numerous benefits:\n\n- **24/7 Availability**: Your customers can get help anytime\n- **Instant Responses**: No more waiting in queue\n- **Scalability**: Handle thousands of conversations simultaneously\n- **Cost Effective**: Reduce support costs by up to 30%\n\n## Setting Up Your First Chatbot\n\n### Step 1: Define Your Goals\n\nBefore diving into the technical setup, clearly define what you want your chatbot to achieve. Common goals include:\n\n- Customer support automation\n- Lead generation\n- FAQ handling\n- Appointment scheduling\n\n### Step 2: Build Your Knowledge Base\n\nYour chatbot is only as good as the information it has access to. Upload relevant documents, FAQs, and product information to create a comprehensive knowledge base.\n\n### Step 3: Train and Test\n\nUse real customer queries to test your chatbot''s responses. Iterate and improve based on feedback.\n\n## Conclusion\n\nBuilding an AI chatbot doesn''t have to be complicated. With Githaforge, you can have a fully functional chatbot up and running in minutes.',
    'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=1200&h=630&fit=crop',
    'AI chatbot illustration with digital brain concept',
    (SELECT id FROM blog_categories WHERE slug = 'tutorials'),
    ARRAY['chatbots', 'ai', 'getting-started', 'tutorial'],
    'Githaforge Team',
    'published',
    NOW() - INTERVAL '2 days',
    TRUE,
    8,
    'Getting Started with AI Chatbots | Githaforge Blog',
    'Learn how to build and deploy your first AI-powered chatbot with our comprehensive guide. From setup to optimization, we cover it all.'
),
(
    'Top 10 Ways AI is Transforming Customer Service in 2025',
    'top-10-ways-ai-transforming-customer-service-2025',
    'Discover how artificial intelligence is reshaping customer service and what it means for your business in 2025.',
    E'# Top 10 Ways AI is Transforming Customer Service\n\nThe customer service landscape is undergoing a dramatic transformation, thanks to advances in artificial intelligence. Here are the top 10 ways AI is changing the game.\n\n## 1. Intelligent Chatbots\n\nModern AI chatbots can understand context, sentiment, and intent, providing human-like interactions 24/7.\n\n## 2. Predictive Analytics\n\nAI can predict customer issues before they occur, enabling proactive support.\n\n## 3. Personalized Experiences\n\nMachine learning algorithms analyze customer data to deliver tailored experiences.\n\n## 4. Voice Assistants\n\nVoice-enabled AI is making customer service more accessible than ever.\n\n## 5. Automated Ticket Routing\n\nAI intelligently routes support tickets to the right agent based on expertise and availability.\n\n## 6. Sentiment Analysis\n\nReal-time sentiment analysis helps agents understand customer emotions.\n\n## 7. Knowledge Base Optimization\n\nAI continuously improves knowledge bases based on customer queries.\n\n## 8. Multi-language Support\n\nAI-powered translation enables global customer support.\n\n## 9. Quality Assurance\n\nAutomated QA ensures consistent service quality.\n\n## 10. Self-Service Portals\n\nIntelligent self-service options reduce support load while improving satisfaction.\n\n## The Future is Now\n\nBusinesses that embrace AI in customer service are seeing significant improvements in efficiency and customer satisfaction.',
    'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&h=630&fit=crop',
    'Robot hand reaching towards human representing AI customer service',
    (SELECT id FROM blog_categories WHERE slug = 'industry-news'),
    ARRAY['ai', 'customer-service', 'trends', '2025'],
    'Githaforge Team',
    'published',
    NOW() - INTERVAL '5 days',
    TRUE,
    6,
    'Top 10 Ways AI is Transforming Customer Service | Githaforge',
    'Explore how AI is revolutionizing customer service in 2025. From intelligent chatbots to predictive analytics.'
),
(
    'How TechCorp Reduced Support Costs by 40% with Githaforge',
    'techcorp-reduced-support-costs-40-percent-githaforge',
    'A detailed case study on how TechCorp implemented Githaforge chatbots and achieved remarkable results.',
    E'# Case Study: TechCorp''s Success with Githaforge\n\n## The Challenge\n\nTechCorp, a fast-growing SaaS company, was struggling with:\n\n- High support ticket volume\n- Long response times\n- Rising support costs\n- Customer satisfaction declining\n\n## The Solution\n\nTechCorp implemented Githaforge''s AI chatbot platform to:\n\n1. Automate responses to common queries\n2. Provide 24/7 customer support\n3. Route complex issues to human agents\n4. Build a comprehensive knowledge base\n\n## The Results\n\nAfter 6 months of using Githaforge:\n\n- **40% reduction** in support costs\n- **65% decrease** in average response time\n- **92% customer satisfaction** rate\n- **50% fewer** tickets escalated to human agents\n\n## Key Takeaways\n\n"Githaforge transformed our customer support. Our team can now focus on complex issues while the AI handles routine queries efficiently." - Sarah Johnson, VP of Customer Success\n\n## Ready to Transform Your Support?\n\nStart your free trial today and see similar results for your business.',
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=630&fit=crop',
    'Team celebrating success with analytics dashboard in background',
    (SELECT id FROM blog_categories WHERE slug = 'case-studies'),
    ARRAY['case-study', 'success-story', 'roi', 'customer-support'],
    'Githaforge Team',
    'published',
    NOW() - INTERVAL '10 days',
    FALSE,
    5,
    'TechCorp Case Study: 40% Cost Reduction | Githaforge',
    'Learn how TechCorp reduced support costs by 40% using Githaforge AI chatbots. Real results, real impact.'
),
(
    'Introducing Multi-Language Support for Your Chatbots',
    'introducing-multi-language-support-chatbots',
    'We''re excited to announce multi-language support, enabling your chatbots to communicate in over 50 languages.',
    E'# Introducing Multi-Language Support\n\nWe''re thrilled to announce a major new feature: **Multi-Language Support** for all Githaforge chatbots!\n\n## What''s New?\n\nYour chatbots can now automatically detect and respond in your customers'' preferred language. We support over 50 languages including:\n\n- English\n- Spanish\n- French\n- German\n- Arabic\n- Chinese\n- Japanese\n- And many more!\n\n## How It Works\n\n1. **Automatic Detection**: Our AI automatically detects the language of incoming messages\n2. **Seamless Translation**: Responses are generated in the detected language\n3. **Context Preservation**: Meaning and context are preserved across translations\n\n## Getting Started\n\nMulti-language support is available on all Pro and Enterprise plans. To enable it:\n\n1. Go to your chatbot settings\n2. Navigate to Language Settings\n3. Enable "Multi-Language Support"\n4. Select your preferred languages\n\n## Try It Today\n\nLog in to your dashboard and start serving customers in their native language!',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=630&fit=crop',
    'Digital globe showing global connectivity and languages',
    (SELECT id FROM blog_categories WHERE slug = 'product-updates'),
    ARRAY['product-update', 'multi-language', 'feature', 'announcement'],
    'Githaforge Team',
    'published',
    NOW() - INTERVAL '1 day',
    FALSE,
    4,
    'Multi-Language Chatbot Support Now Available | Githaforge',
    'Githaforge chatbots now support 50+ languages with automatic detection and seamless translation.'
)
ON CONFLICT (slug) DO NOTHING;
