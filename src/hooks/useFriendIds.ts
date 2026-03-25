import { api } from "@/services/api";
import type { FriendshipResponse } from "@/types/api";
import { useEffect, useState } from "react";

export function useFriendIds(): Set<number> {
  const [ids, setIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    api
      .get<FriendshipResponse[]>("/api/friends")
      .then((friends) => setIds(new Set(friends.map((f) => f.other_user.id))))
      .catch(() => {});
  }, []);

  return ids;
}
