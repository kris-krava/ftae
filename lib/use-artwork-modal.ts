'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchArtworkModal, type ArtworkModalPayload } from '@/app/_actions/discover';

// Shared modal state for the ArtworkDetailsModal across profile / Discover /
// Home. Owns the payload, the open + close handlers, and the cross-component
// listeners that react when EditArtModal completes a save or delete. The
// dispatch side lives in lib/artwork-events.ts.
export function useArtworkModal() {
  const [modal, setModal] = useState<ArtworkModalPayload | null>(null);
  const modalRef = useRef<ArtworkModalPayload | null>(null);

  // Mirror the latest state into a ref so the event-handler effect below can
  // read it without taking modal as a dependency (which would re-bind the
  // listeners on every modal change). Also lets us call fetchArtworkModal
  // outside the setState updater — necessary under React 19 / Next 16, which
  // warns when a Server Action's implicit router refresh fires inside a
  // pure-updater closure.
  useEffect(() => {
    modalRef.current = modal;
  }, [modal]);

  const openArtwork = useCallback(async (artworkId: string) => {
    const payload = await fetchArtworkModal(artworkId);
    if (payload) setModal(payload);
  }, []);

  const closeModal = useCallback(() => setModal(null), []);

  useEffect(() => {
    function onUpdated(e: WindowEventMap['artwork:updated']) {
      const { artworkId } = e.detail;
      const cur = modalRef.current;
      if (!cur || cur.artwork.id !== artworkId) return;
      // Refetch and replace so the visible modal shows the new title /
      // photos / focal points without closing.
      fetchArtworkModal(artworkId).then((next) => {
        setModal((latest) => {
          if (!latest || latest.artwork.id !== artworkId) return latest;
          return next ?? null;
        });
      });
    }

    function onDeleted(e: WindowEventMap['artwork:deleted']) {
      const { artworkId } = e.detail;
      setModal((cur) => (cur && cur.artwork.id === artworkId ? null : cur));
    }

    window.addEventListener('artwork:updated', onUpdated);
    window.addEventListener('artwork:deleted', onDeleted);
    return () => {
      window.removeEventListener('artwork:updated', onUpdated);
      window.removeEventListener('artwork:deleted', onDeleted);
    };
  }, []);

  return { modal, openArtwork, closeModal };
}
