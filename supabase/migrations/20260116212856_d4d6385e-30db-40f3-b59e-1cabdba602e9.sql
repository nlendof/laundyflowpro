-- Enable realtime for laundry_users table
ALTER PUBLICATION supabase_realtime ADD TABLE public.laundry_users;

-- Enable realtime for profiles table
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;