"use strict";

const { Op } = require("sequelize");
const { Invitation, Player, sequelize } = require("../../models");

const logger = require("../../logger");

const INVITATION_VALID_HOURS = "48";

// Avoid eager-loading the associations if possible
function getInclude(info) {
  let include = [];

  info.fieldNodes[0].selectionSet.selections.forEach((field) => {
    if (field.name.value === "player") {
      include.push({ model: Player, as: "player" });
      return;
    }
  });

  return include;
}

// Build the query filter based on provided fields
function getFilter(filter) {
  let queryFilter = [];

  if (typeof filter.id !== "undefined") {
    queryFilter.push({ id: { [Op.eq]: filter.id } });
  }

  return queryFilter;
}

//  #### Description
//    Associate player to the invitation
//
//  #### Parameters
//    * invitation: the invitation to update
//    * player: the player ID to link to the invitation
//    * transaction: the related database transaction
//
//  #### Returns
//    * invitation: the invitation updated with its player
async function setPlayer(invitation, player, transaction) {
  if (typeof player === "undefined") return invitation;

  const logFields = { invitation, player, type: "Invitation setPlayer" };

  const result = await Player.findByPk(player);
  if (result === null) {
    logger.error("Player not found", { logFields });
    throw new Error("Player not found");
  }

  if ((await result.getUser()).length) {
    logger.error("Player already linked to a user", { logFields });
    throw new Error("Player already linked to a user");
  }

  try {
    await invitation.setPlayer(result, { transaction });
  } catch (setPlayerError) {
    logger.error(setPlayerError, { logFields });
    throw setPlayerError;
  }

  return invitation;
}

module.exports = {
  Query: {
    //  #### Description
    //    Find all invitations or some invitations based on filter
    //
    //  #### Parameters
    //    * filter: criteria to use when searching for invitations
    //
    //  #### Returns
    //    * findInvitations: the list of invitations with matching criteria or all invitations if the filter is not defined
    async findInvitations(root, { filter }, { authUser }, info) {
      if (!authUser) throw new Error("Unauthorized");

      const include = getInclude(info);
      const order = [["validUntil", "DESC"]];

      let logFields = { type: "Invitation search" };
      let where = null;

      if (typeof filter !== "undefined") {
        where = { [Op.and]: getFilter(filter) };
        logFields.filter = filter;
      }

      logger.debug("Invitation search", { logFields });

      try {
        return await Invitation.findAll({ where, order, include });
      } catch (findError) {
        if (logFields === null) logFields = {};
        logger.error(findError, { logFields });
        throw findError;
      }
    },
  },

  Mutation: {
    //  #### Description
    //    Create a new invitation
    //
    //  #### Parameters
    //    * invitation: the invitation to create
    //
    //  #### Returns
    //    * createInvitation: the newly created invitation
    async createInvitation(root, { invitation }, { authUser }, info) {
      if (!authUser || !authUser.isAdmin) throw new Error("Unauthorized");

      const include = getInclude(info);
      const logFields = { invitation, type: "Invitation creation" };

      logger.info("Invitation creation", { logFields });

      let result;
      let validUntilDate = new Date();
      validUntilDate.setHours(
        validUntilDate.getHours() + INVITATION_VALID_HOURS
      );

      try {
        result = await Invitation.create(
          {
            validUntil: validUntilDate,
            isAdmin: invitation.isAdmin,
          },
          { include }
        );
      } catch (createError) {
        logger.error(createError, { logFields });
        throw createError;
      }

      const transaction = await sequelize.transaction();
      try {
        await setPlayer(result, invitation.player, transaction);
      } catch (associationsError) {
        await transaction.rollback();
        await Invitation.destroy({ where: { id: result.id } });
        throw associationsError;
      }

      await transaction.commit();
      return result.reload();
    },

    //  #### Description
    //    Delete an existing invitation
    //
    //  #### Parameters
    //    * id: id of the invitation to delete
    //
    //  #### Returns
    //    * deleteInvitation: boolean describing if the operation was successful or not
    async deleteInvitation(root, { id }, { authUser }, info) {
      if (!authUser || !authUser.isAdmin) throw new Error("Unauthorized");

      const logFields = { id, type: "Invitation deletion" };

      logger.info("Invitation deletion", { logFields });

      try {
        return await Invitation.destroy({ where: { id } });
      } catch (deleteError) {
        logger.error(deleteError, { logFields });
        throw deleteError;
      }
    },
  },
};
