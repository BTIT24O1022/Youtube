import playlist from "../Modals/playlist.js";

export const createplaylist = async (req, res) => {
  try {
    const newPlaylist = await playlist.create({
      owner: req.userId,
      name: req.body.name,
      isPublic: !!req.body.isPublic,
    });
    return res.status(201).json(newPlaylist);
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getmyplaylists = async (req, res) => {
  const { userId } = req.params;
  if (userId !== req.userId) {
    return res.status(403).json({ message: "You can only view your own playlists" });
  }
  try {
    const playlists = await playlist.find({ owner: userId }).populate("videos");
    return res.status(200).json(playlists);
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getplaylistbyid = async (req, res) => {
  try {
    const found = await playlist.findById(req.params.id).populate("videos").populate("owner", "channelname name");
    if (!found) return res.status(404).json({ message: "Playlist not found" });
    if (!found.isPublic && String(found.owner._id) !== req.userId) {
      return res.status(403).json({ message: "This playlist is private" });
    }
    return res.status(200).json(found);
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const assertOwner = async (id, userId) => {
  const found = await playlist.findById(id);
  if (!found) return { error: 404, msg: "Playlist not found" };
  if (String(found.owner) !== userId) return { error: 403, msg: "Not your playlist" };
  return { found };
};

export const renameplaylist = async (req, res) => {
  const check = await assertOwner(req.params.id, req.userId);
  if (check.error) return res.status(check.error).json({ message: check.msg });
  check.found.name = req.body.name;
  await check.found.save();
  return res.status(200).json(check.found);
};

export const deleteplaylist = async (req, res) => {
  const check = await assertOwner(req.params.id, req.userId);
  if (check.error) return res.status(check.error).json({ message: check.msg });
  await playlist.findByIdAndDelete(req.params.id);
  return res.status(200).json({ deleted: true });
};

export const addvideotoplaylist = async (req, res) => {
  const check = await assertOwner(req.params.id, req.userId);
  if (check.error) return res.status(check.error).json({ message: check.msg });
  if (!check.found.videos.includes(req.body.videoId)) {
    check.found.videos.push(req.body.videoId);
    await check.found.save();
  }
  return res.status(200).json(check.found);
};

export const removevideofromplaylist = async (req, res) => {
  const check = await assertOwner(req.params.id, req.userId);
  if (check.error) return res.status(check.error).json({ message: check.msg });
  check.found.videos = check.found.videos.filter((v) => String(v) !== req.body.videoId);
  await check.found.save();
  return res.status(200).json(check.found);
};
