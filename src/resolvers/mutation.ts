import { IResolvers } from "graphql-tools";
import { getCharacter, getCharacters, asignVoteId, getVote } from "../lib/database-operations";
import { Datetime } from "../lib/datetime";
import { COLLECTIONS, CHANGE_VOTES, CHANGE_VOTE } from "../config/constants";
async function response(status: boolean, message: string, db: any) {
    return {
        status,
        message,
        characters: await getCharacters(db)
    }
}
async function sendNotification(pubsub: any, db: any, id: string) {
    const characters: Array<object> = await getCharacters(db);
    pubsub.publish(CHANGE_VOTES, { changeVotes: characters});
    // FIltrar el personaje seleccionado de la lista 
    const selectCharacter = characters.filter((c: any) => c.id == id)[0];
    pubsub.publish(CHANGE_VOTE, {changeVote: selectCharacter});
}
const mutation: IResolvers = {
    Mutation: {
        async addVote(_: void, { character }, { pubsub, db}) {
            // Comprobar que el personaje existe
            const selectCharacter = await getCharacter(db, character);
            if (selectCharacter === null || selectCharacter === undefined) {
               return response(false, 'El personaje no existe y no se puede votar', db);
            }
            
            // Obtenemos el id del voto y creamos el objeto del voto
            const vote = {
                id: await asignVoteId(db),
                character,
                createdAt: new Datetime().getCurrentDateTime()
            };
            // Añadimos el voto
            return await db.collection(COLLECTIONS.VOTES).insertOne(vote).then(
                async() => {
                    sendNotification(pubsub, db, character);
                    return response(true, 'El personaje existe y se ha emitido correctamente el voto', db)
                }
            ).catch(
                async() => {
                    return response(false, 'El voto NO se ha emitido. Prueba de nuevo por favor', db);
                }
            );    
        },
        async updateVote(_: void, {id, character }, { pubsub, db }) {
            // Comprobar que el personaje existe
            const selectCharacter = await getCharacter(db, character);
            if (selectCharacter === null || selectCharacter === undefined) {
                return response(false, 'El personaje introducido no existe y no puedes actualizar el voto', db);
            }
            // Comprobar que el voto existe
            const selectVote = await getVote(db, id);
            if (selectVote === null || selectVote === undefined) {
                return response(false, 'El voto introducido no existe y no puedes actualizar', db);
            }
            // Actualizar el voto despues de comprobar
            return await db.collection(COLLECTIONS.VOTES).updateOne(
                { id },
                { $set: { character } }
            ).then(
                async() => {
                    sendNotification(pubsub, db, character);
                    return response(true, 'Voto actualizado correctamente', db);
                }
            ).catch(
                async() => {
                    return response(false, 'Voto NO actualizado correctamente. Prueba de nuevo por favor', db);
                }
            )
        },
        async deleteVote(_: void, { id }, { pubsub, db }){
            // COmprobar que el voto existe
            // comprobar que el voto existe
            const selectVote = await getVote(db, id);
            if (selectVote === null || selectVote === undefined) {
                return response(false, 'El voto introducido no existe y no puedes borrarlo', db);
            }
            // Si existe, borrarlo
            return await db.collection(COLLECTIONS.VOTES).deleteOne({ id }).then(
                async() => {
                    sendNotification(pubsub, db, id);
                    return response(true, 'Voto borrado correctamente', db);
                }
            ).catch(
                async() => {
                    return response(false, 'Voto NO borrado. Por favor intentelo de nuevo', db);
                }
            )
        }
    }
}

export default mutation;