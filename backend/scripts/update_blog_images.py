"""
Script to update existing blogs with their featured image URLs
Run this script to add image URLs to blogs that were created before the image feature
Usage: python -m scripts.update_blog_images
"""

import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import get_supabase_client


def update_blog_images():
    """Update existing blogs with their featured image URLs."""
    client = get_supabase_client()

    # Map of blog slugs to their image URLs and alt text
    blog_images = {
        "getting-started-ai-chatbots-complete-guide": {
            "featured_image_url": "https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=1200&h=630&fit=crop",
            "featured_image_alt": "AI chatbot illustration with digital brain concept"
        },
        "top-10-ways-ai-transforming-customer-service-2025": {
            "featured_image_url": "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&h=630&fit=crop",
            "featured_image_alt": "Robot hand reaching towards human representing AI customer service"
        },
        "techcorp-reduced-support-costs-40-percent-githaforge": {
            "featured_image_url": "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=630&fit=crop",
            "featured_image_alt": "Team celebrating success with analytics dashboard in background"
        },
        "introducing-multi-language-support-chatbots": {
            "featured_image_url": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=630&fit=crop",
            "featured_image_alt": "Digital globe showing global connectivity and languages"
        }
    }

    print("Updating blog images...")
    print("=" * 60)

    for slug, image_data in blog_images.items():
        try:
            # Check if blog exists
            existing = client.table("blogs").select("id, title, featured_image_url").eq("slug", slug).execute()

            if existing.data:
                blog = existing.data[0]
                current_url = blog.get("featured_image_url")

                if current_url:
                    print(f"  [{blog['title'][:40]}...] Already has image URL, skipping")
                else:
                    # Update the blog with image URL
                    client.table("blogs").update({
                        "featured_image_url": image_data["featured_image_url"],
                        "featured_image_alt": image_data["featured_image_alt"]
                    }).eq("slug", slug).execute()
                    print(f"  [{blog['title'][:40]}...] Updated with image URL")
            else:
                print(f"  [slug: {slug}] Blog not found, skipping")

        except Exception as e:
            print(f"  Error updating {slug}: {e}")

    print("=" * 60)
    print("Blog image update complete!")


if __name__ == "__main__":
    update_blog_images()
