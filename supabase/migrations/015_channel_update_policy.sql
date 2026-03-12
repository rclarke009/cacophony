-- Allow server admins to update channels (e.g. slowmode)
create policy "Server admins can update channels"
  on public.channels for update
  using (
    exists (
      select 1 from public.server_members
      where server_id = channels.server_id and user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );
