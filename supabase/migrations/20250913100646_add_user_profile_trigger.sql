-- Add trigger to automatically create profile when user signs up
-- This fixes the issue where profiles are not created automatically when users register

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
