import { supabase } from './supabase';
import { mapRow, type PostData } from './posts';

export interface PopupRule {
  id: string;
  post_id: string;
  target_post_id: string;
  is_active: boolean;
  target_post?: Pick<PostData, 'id' | 'title' | 'featuredImage'>;
}

export async function getPopupTargetPost(
  postId: string
): Promise<Pick<PostData, 'id' | 'title' | 'featuredImage'> | null> {
  const { data, error } = await supabase
    .from('popup_rules')
    .select('target_post_id, posts!popup_rules_target_post_id_fkey(id, title, featured_image, feature_image)')
    .eq('post_id', postId)
    .eq('is_active', true)
    .single();

  if (error || !data) return null;

  const post = (data as unknown as { posts: Record<string, unknown> | null }).posts;
  if (!post) return null;

  const mapped = mapRow(post);
  return { id: mapped.id, title: mapped.title, featuredImage: mapped.featuredImage };
}
