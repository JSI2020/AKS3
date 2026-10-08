# Regain SSH for aks-atelier.com (no old key)

Server IP: `46.225.213.37`  
Local public key (already generated on this PC):

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEYRdKPZcIW3Pnl4eUmheUq0BhrhVtJ6ri7z8kzVpaV7 aks-deploy@BN-LAP-PF2Y4F2F
```

## Option A — Hetzner Cloud Console (recommended)

1. Log in: https://console.hetzner.cloud/
2. Open the project that owns `46.225.213.37`
3. **Security → SSH Keys → Add SSH key** → paste the public key above → Save
4. Open the **server** → **Rescue** (or **ISO Images** / console):
   - Enable **Rescue**, reboot into rescue, mount the disk, then:
     ```bash
     mount /dev/sda1 /mnt   # partition may differ; check lsblk
     mkdir -p /mnt/root/.ssh
     echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEYRdKPZcIW3Pnl4eUmheUq0BhrhVtJ6ri7z8kzVpaV7 aks-deploy@BN-LAP-PF2Y4F2F' >> /mnt/root/.ssh/authorized_keys
     chmod 700 /mnt/root/.ssh
     chmod 600 /mnt/root/.ssh/authorized_keys
     reboot
     ```
   - Or use **Console** if you still have a root password and paste the same `echo … >> authorized_keys` while the normal OS is running.

5. From this PC test:
   ```powershell
   ssh -i $env:USERPROFILE\.ssh\id_aks root@46.225.213.37
   ```

## Option B — Reset root password

1. Hetzner Console → server → **Reset root password**
2. Log in via **Console** with the new password
3. Paste the `echo 'ssh-ed25519 …' >> ~/.ssh/authorized_keys` commands
4. Then SSH with `id_aks` as above

After SSH works, say **“SSH ready”** and the agent will finish deploy (git pull / compose / env / verify).
