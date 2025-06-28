// js/api.js

const SUPABASE_URL = 'https://mnvdpvsivqqbzbtjtpws.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1udmRwdnNpdnFxYnpidGp0cHdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNTIxMDMsImV4cCI6MjA1NTYyODEwM30.yasDnEOlUi6zKNsnuPXD8RA6tsPljrwBRQNPVLsXAks';
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 投稿関連
export const fetchTimeline = (tab, followList = []) => {
    let query = supabase.from('post')
        .select('*, user(id, name), reply_to:reply_id(id, user(id, name)), reply_count:post(count)')
        .order('time', { ascending: false })
        .limit(50);
    if (tab === 'following' && followList.length > 0) {
        query = query.in('userid', followList);
    }
    return query;
};

export const fetchPostDetail = (postId) => {
    return supabase.from('post')
        .select('*, user(id, name), reply_to:reply_id(id, user(id, name)), replies:post(count)')
        .eq('id', postId)
        .single();
};

export const fetchPostsByIds = (ids) => {
    return supabase.from('post')
        .select('*, user(id, name), reply_to:reply_id(id, user(id, name)), reply_count:post(count)')
        .in('id', ids)
        .order('time', { ascending: false });
};

export const createPost = (postData) => {
    return supabase.from('post').insert(postData).select('*, user(id, name)').single();
};

export const deletePost = (postId) => {
    return supabase.from('post').delete().eq('id', postId);
};

// ユーザー関連
export const fetchUser = (userId) => {
    return supabase.from('user').select('*').eq('id', userId).single();
};

export const fetchFollowerCount = (userId) => {
    return supabase.from('user').select('id', { count: 'exact', head: true }).contains('follow', [userId]);
};

export const fetchUsers = (userIds) => {
    return supabase.from('user').select('id, name, me').in('id', userIds);
};

export const updateUser = (userId, updatedData) => {
    return supabase.from('user').update(updatedData).eq('id', userId).select().single();
};

// RPC（データベース関数）呼び出し
export const getRecommendedUsers = (limit) => {
    return supabase.rpc('get_recommended_users', { count_limit: limit });
};

export const togglePostLike = (postId, increment) => {
    return supabase.rpc('handle_like', { post_id: postId, increment_val: increment });
};