-- Enable realtime for jobs table so the board updates live
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;